import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { parseFeed } from '@/lib/rssParser'
import { normalizeTitle, normalizeFirstAuthor, normalizeDoi } from '@/lib/entryDedup'
import { embedBatch, embedText, buildPaperEmbeddingText } from '@/lib/research/embeddings'
import { extractMetadata } from '@/lib/research/geminiResearch'
import { Prisma } from '@prisma/client'

const CRON_SECRET = process.env.CRON_SECRET

function isVercelCronRequest(request: NextRequest): boolean {
  return Boolean(request.headers.get('x-vercel-cron'))
}

function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return true
  }

  if (isVercelCronRequest(request)) {
    return true
  }

  return false
}

// ========== Ingestion Sources ==========

const ARXIV_RSS_FEEDS = [
  'https://rss.arxiv.org/rss/cs.AI',
  'https://rss.arxiv.org/rss/cs.LG',
  'https://rss.arxiv.org/rss/cs.CL',
  'https://rss.arxiv.org/rss/cs.CV',
  'https://rss.arxiv.org/rss/cs.NE',
  'https://rss.arxiv.org/rss/stat.ML',
  'https://rss.arxiv.org/rss/q-bio',
  'https://rss.arxiv.org/rss/eess.SP',
  'https://rss.arxiv.org/rss/physics.med-ph',
]

const BIORXIV_FEEDS = [
  'https://connect.biorxiv.org/biorxiv_xml.php?subject=neuroscience',
  'https://connect.biorxiv.org/biorxiv_xml.php?subject=bioinformatics',
  'https://connect.medrxiv.org/medrxiv_xml.php?subject=all',
]

// Note: PubMed and Semantic Scholar bulk require API calls, not RSS.
// For MVP, arXiv + bioRxiv/medRxiv cover the primary academic sources.

// ========== Ingestion Logic ==========

interface RawPaper {
  title: string
  authors: string[]
  abstract: string | null
  url: string | null
  doi: string | null
  arxivId: string | null
  publishedDate: Date | null
  source: string
}

async function ingestFromFeed(feedUrl: string, sourceLabel: string): Promise<RawPaper[]> {
  try {
    const feed = await parseFeed(feedUrl)
    return feed.items.map((item) => {
      // Extract arXiv ID from URL
      const arxivMatch = (item.url ?? '').match(/arxiv\.org\/abs\/([^\s?#]+)/)
      const arxivId = arxivMatch?.[1] ?? null

      // Extract DOI from description or link
      const doiMatch = (item.description ?? item.url ?? '').match(/doi\.org\/([^\s"'<>]+)/)
      const doi = doiMatch?.[1] ?? null

      // Extract authors from author field or title parsing
      const authorStr = (item as any).author as string | undefined
      const authors = authorStr
        ? authorStr.split(/[,;]/).map((a) => a.trim()).filter(Boolean)
        : []

      return {
        title: item.title,
        authors,
        abstract: item.description ?? null,
        url: item.url,
        doi: doi ? normalizeDoi(doi) : null,
        arxivId,
        publishedDate: item.publishedDate,
        source: sourceLabel,
      }
    }).filter((p) => p.title.length > 3)
  } catch (err) {
    console.error(`[research-ingest] Failed to parse ${feedUrl}:`, err)
    return []
  }
}

/** Check if a paper already exists in CandidatePaper by DOI or arxivId or title hash. */
async function isAlreadyIngested(paper: RawPaper): Promise<boolean> {
  if (paper.doi) {
    const existing = await prisma.candidatePaper.findUnique({ where: { doi: paper.doi }, select: { id: true } })
    if (existing) return true
  }
  if (paper.arxivId) {
    const existing = await prisma.candidatePaper.findUnique({ where: { arxivId: paper.arxivId }, select: { id: true } })
    if (existing) return true
  }
  // Title+author hash check
  const normTitle = normalizeTitle(paper.title)
  const normAuthor = normalizeFirstAuthor(paper.authors)
  if (normTitle && normAuthor) {
    const existing = await prisma.candidatePaper.findFirst({
      where: {
        title: { contains: paper.title.slice(0, 50) },
      },
      select: { id: true, title: true },
    })
    if (
      existing &&
      normalizeTitle(existing.title) === normTitle
    ) {
      return true
    }
  }
  return false
}

async function ingestPapers(papers: RawPaper[]): Promise<number> {
  let created = 0
  for (const paper of papers) {
    try {
      const exists = await isAlreadyIngested(paper)
      if (exists) continue

      await prisma.candidatePaper.create({
        data: {
          doi: paper.doi,
          arxivId: paper.arxivId,
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract,
          url: paper.url,
          source: paper.source,
          publishedDate: paper.publishedDate,
          embeddedAt: null,
        },
      })
      created++
    } catch (err: unknown) {
      // Skip duplicate key violations gracefully
      if ((err as { code?: string })?.code !== 'P2002') {
        console.error(`[research-ingest] Failed to insert "${paper.title}":`, err)
      }
    }
  }
  return created
}

// ========== Embedding Step ==========

const EMBED_BATCH_SIZE = 50
const EMBED_LIMIT_PER_RUN = Number(process.env.RESEARCH_EMBED_LIMIT ?? 100)
const ENABLE_METADATA_ENRICHMENT = process.env.RESEARCH_EMBED_METADATA === 'true'

function vectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`
}

async function embedUnprocessedPapers(): Promise<{
  processed: number
  failed: number
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  console.log(`[research-ingest] GEMINI_API_KEY present: ${Boolean(apiKey)}`)

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "CandidatePaper"
    SET "embeddedAt" = NULL
    WHERE "embedding" IS NULL
      AND ("source" LIKE 'arXiv:%' OR "source" = 'bioRxiv' OR "source" = 'medRxiv')
  `)

  // FUTURE: Re-enable abstract: { not: null } filter when full abstracts are available
  // Currently using title-only embedding for papers without abstracts from RSS snippets
  const unembedded = await prisma.candidatePaper.findMany({
    where: {
      embeddedAt: null,
      OR: [
        { source: { startsWith: 'arXiv:' } },
        { source: 'bioRxiv' },
        { source: 'medRxiv' },
      ],
    },
    orderBy: { ingestedAt: 'asc' },
    take: EMBED_LIMIT_PER_RUN, // cap per cron run to avoid serverless timeout
    select: { id: true, title: true, abstract: true },
  })

  console.log(`[research-ingest] ${unembedded.length} papers need embedding`)

  let processed = 0
  let failed = 0

  // Phase 1: Embed all papers in batches (no LLM calls, just embedding API)
  const embeddingMap = new Map<string, number[]>()

  for (let i = 0; i < unembedded.length; i += EMBED_BATCH_SIZE) {
    const batch = unembedded.slice(i, i + EMBED_BATCH_SIZE)
    const texts = batch.map((p) => buildPaperEmbeddingText(p.title, p.abstract))

    try {
      const embeddings = await embedBatch(texts)
      for (let j = 0; j < batch.length; j++) {
        if (embeddings[j] && embeddings[j].length > 0) {
          embeddingMap.set(batch[j].id, embeddings[j])
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[research-ingest] Embedding batch ${i / EMBED_BATCH_SIZE} failed:`, errorMessage)
      console.error(`[research-ingest] Sample text from failed batch:`, texts[0]?.slice(0, 100))

      // Fallback: attempt single-item embedding to salvage partial progress
      // when batch endpoint/model behavior is flaky.
      for (let j = 0; j < batch.length; j++) {
        try {
          const single = await embedText(texts[j])
          if (single && single.length > 0) {
            embeddingMap.set(batch[j].id, single)
          } else {
            failed += 1
          }
        } catch (singleErr) {
          const singleMessage = singleErr instanceof Error ? singleErr.message : String(singleErr)
          console.error(`[research-ingest] Single embedding failed for ${batch[j].id}:`, singleMessage)
          failed += 1
        }
      }
    }

    // 2-second pause between embedding batches
    if (i + EMBED_BATCH_SIZE < unembedded.length) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  console.log(`[research-ingest] Got ${embeddingMap.size} embeddings, saving...`)

  // Phase 2: Save embeddings to DB (fast, no API calls)
  const embeddingEntries = Array.from(embeddingMap.entries())
  for (const [paperId, embedding] of embeddingEntries) {
    try {
      const embeddingVector = vectorLiteral(embedding)
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "CandidatePaper"
        SET "embedding" = ${embeddingVector}::vector,
            "embeddedAt" = NOW()
        WHERE "id" = ${paperId}
      `)
      processed++
    } catch (err) {
      console.error(`[research-ingest] Failed to save embedding for ${paperId}:`, err)
      failed++
    }
  }

  // Phase 3: Optional metadata extraction for newly embedded papers.
  // Disabled by default to keep cron runtime within serverless limits.
  if (ENABLE_METADATA_ENRICHMENT) {
    const newlyEmbedded = unembedded.filter((p) => embeddingMap.has(p.id))
    const META_CONCURRENCY = 5

    for (let i = 0; i < newlyEmbedded.length; i += META_CONCURRENCY) {
      const chunk = newlyEmbedded.slice(i, i + META_CONCURRENCY)
      await Promise.allSettled(
        chunk.map(async (paper) => {
          try {
            const meta = await extractMetadata(paper.title, paper.abstract ?? '')
            await prisma.candidatePaper.update({
              where: { id: paper.id },
              data: {
                candidateMetadata: meta as unknown as Prisma.InputJsonValue,
              },
            })
          } catch {
            // Metadata extraction failure is non-fatal — embedding is already saved
          }
        })
      )

      if (i + META_CONCURRENCY < newlyEmbedded.length) {
        await new Promise((r) => setTimeout(r, 500))
      }
    }
  }

  return { processed, failed }
}

// ========== User RSS Sources ==========

async function ingestUserRSSFeeds(): Promise<number> {
  const sources = await prisma.source.findMany({
    include: { userSources: { take: 1 } }, // only fetch sources with at least one subscriber
  })
  const activeSources = sources.filter((s) => s.userSources.length > 0)

  let created = 0
  for (const source of activeSources) {
    const papers = await ingestFromFeed(source.feedUrl, source.title ?? source.domain)
    created += await ingestPapers(papers)
    await prisma.source.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date() },
    })
  }
  return created
}

// ========== Main Handler ==========

async function runIngestPipeline() {
  const results = {
    arxivPapers: 0,
    biorxivPapers: 0,
    rssPapers: 0,
    embedded: 0,
    embedFailed: 0,
  }

  // Step 1: Ingest from arXiv RSS
  console.log('[research-ingest] Fetching arXiv feeds...')
  const arxivPapers: RawPaper[] = []
  for (const feedUrl of ARXIV_RSS_FEEDS) {
    const feedLabel = feedUrl.split('/').pop() ?? 'arXiv'
    const papers = await ingestFromFeed(feedUrl, `arXiv:${feedLabel}`)
    console.log(`[research-ingest] Fetched ${papers.length} papers from ${feedLabel}`)
    arxivPapers.push(...papers)
  }
  console.log(`[research-ingest] Total arXiv papers fetched: ${arxivPapers.length}`)
  results.arxivPapers = await ingestPapers(arxivPapers)
  console.log(`[research-ingest] arXiv: ${results.arxivPapers} new papers`)

  // Step 1b: Ingest from bioRxiv/medRxiv
  const bioPapers: RawPaper[] = []
  for (const feedUrl of BIORXIV_FEEDS) {
    const label = feedUrl.includes('medrxiv') ? 'medRxiv' : 'bioRxiv'
    const papers = await ingestFromFeed(feedUrl, label)
    bioPapers.push(...papers)
  }
  results.biorxivPapers = await ingestPapers(bioPapers)
  console.log(`[research-ingest] bioRxiv/medRxiv: ${results.biorxivPapers} new papers`)

  // Step 1c: User RSS subscriptions
  results.rssPapers = await ingestUserRSSFeeds()
  console.log(`[research-ingest] User RSS: ${results.rssPapers} new papers`)

  // Step 2: Embed unprocessed papers
  console.log('[research-ingest] Embedding unprocessed papers...')
  const embedResult = await embedUnprocessedPapers()
  results.embedded = embedResult.processed
  results.embedFailed = embedResult.failed

  return results
}

async function runEmbedOnlyPipeline(embedByTitle: boolean) {
  const results = {
    arxivPapers: 0,
    biorxivPapers: 0,
    rssPapers: 0,
    embedded: 0,
    embedFailed: 0,
  }

  // Step 2: Embed unprocessed papers
  console.log(`[research-ingest] Embedding unprocessed papers (embed-only mode${embedByTitle ? ', title-only' : ''})...`)
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "CandidatePaper"
    SET "embeddedAt" = NULL
    WHERE "embedding" IS NULL
      AND ("source" LIKE 'arXiv:%' OR "source" = 'bioRxiv' OR "source" = 'medRxiv')
  `)

  const unembedded = await prisma.candidatePaper.findMany({
    where: {
      embeddedAt: null,
      OR: [
        { source: { startsWith: 'arXiv:' } },
        { source: 'bioRxiv' },
        { source: 'medRxiv' },
      ],
    },
    orderBy: { ingestedAt: 'asc' },
    take: EMBED_LIMIT_PER_RUN,
    select: { id: true, title: true, abstract: true },
  })

  let processed = 0
  let failed = 0

  for (let i = 0; i < unembedded.length; i += EMBED_BATCH_SIZE) {
    const batch = unembedded.slice(i, i + EMBED_BATCH_SIZE)
    const texts = batch.map((p) => buildPaperEmbeddingText(p.title, embedByTitle ? null : p.abstract))
    try {
      const embeddings = await embedBatch(texts)
      for (let j = 0; j < batch.length; j++) {
        const emb = embeddings[j]
        if (!emb) continue
        const embeddingVector = vectorLiteral(emb)
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "CandidatePaper"
          SET "embedding" = ${embeddingVector}::vector,
              "embeddedAt" = NOW()
          WHERE "id" = ${batch[j].id}
        `)
        processed += 1
      }
    } catch (err) {
      failed += batch.length
      console.error(`[research-ingest] Embed-only batch ${i / EMBED_BATCH_SIZE} failed:`, err)
    }
  }

  const embedResult = { processed, failed }
  results.embedded = embedResult.processed
  results.embedFailed = embedResult.failed

  return results
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // In development, allow without secret
  }

  try {
    const { searchParams } = new URL(request.url)
    const embedOnly = searchParams.get('embedOnly') === '1' || searchParams.get('embedOnly') === 'true'
    const embedByTitle = searchParams.get('embedMode') === 'title' || searchParams.get('embedByTitle') === '1'

    console.log('[research-ingest] Starting...')
    const results = embedOnly
      ? await runEmbedOnlyPipeline(embedByTitle)
      : await runIngestPipeline()
    console.log('[research-ingest] Complete:', results)
    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    console.error('[research-ingest] Fatal error:', err)
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
