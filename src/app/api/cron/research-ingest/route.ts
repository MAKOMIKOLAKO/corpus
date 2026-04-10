import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { parseFeed } from '@/lib/rssParser'
import { normalizeTitle, normalizeFirstAuthor, normalizeDoi } from '@/lib/entryDedup'
import { embedBatch, buildPaperEmbeddingText } from '@/lib/research/embeddings'
import { extractMetadata } from '@/lib/research/geminiResearch'
import { Prisma } from '@prisma/client'

const CRON_SECRET = process.env.CRON_SECRET

function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${CRON_SECRET}`
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

async function embedUnprocessedPapers(): Promise<{
  processed: number
  failed: number
}> {
  const unembedded = await prisma.candidatePaper.findMany({
    where: { embeddedAt: null, abstract: { not: null } },
    orderBy: { ingestedAt: 'desc' },
    take: 500, // cap per cron run
    select: { id: true, title: true, abstract: true },
  })

  console.log(`[research-ingest] ${unembedded.length} papers need embedding`)

  let processed = 0
  let failed = 0

  for (let i = 0; i < unembedded.length; i += EMBED_BATCH_SIZE) {
    const batch = unembedded.slice(i, i + EMBED_BATCH_SIZE)
    const texts = batch.map((p) => buildPaperEmbeddingText(p.title, p.abstract))

    try {
      const embeddings = await embedBatch(texts)

      // For each paper: embed + extract metadata
      await Promise.allSettled(
        batch.map(async (paper, j) => {
          const embedding = embeddings[j]
          if (!embedding) return

          let meta = null
          try {
            meta = await extractMetadata(paper.title, paper.abstract ?? '')
          } catch {
            // Metadata extraction failure is non-fatal
          }

          await prisma.candidatePaper.update({
            where: { id: paper.id },
            data: {
              embedding: embedding as Prisma.InputJsonValue,
              candidateMetadata: (meta as unknown as Prisma.InputJsonValue) ?? undefined,
              embeddedAt: new Date(),
            },
          })
          processed++
        })
      )
    } catch (err) {
      console.error(`[research-ingest] Embedding batch ${i / EMBED_BATCH_SIZE} failed:`, err)
      failed += batch.length
    }

    // 2-second pause between batches per spec
    if (i + EMBED_BATCH_SIZE < unembedded.length) {
      await new Promise((r) => setTimeout(r, 2000))
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
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

  const arxivPapers: RawPaper[] = []
  for (const feedUrl of ARXIV_RSS_FEEDS) {
    const feedLabel = feedUrl.split('/').pop() ?? 'arXiv'
    const papers = await ingestFromFeed(feedUrl, `arXiv:${feedLabel}`)
    arxivPapers.push(
      ...papers.filter((p) => !p.publishedDate || p.publishedDate >= fortyEightHoursAgo)
    )
  }
  results.arxivPapers = await ingestPapers(arxivPapers)
  console.log(`[research-ingest] arXiv: ${results.arxivPapers} new papers`)

  // Step 1b: Ingest from bioRxiv/medRxiv
  const bioPapers: RawPaper[] = []
  for (const feedUrl of BIORXIV_FEEDS) {
    const label = feedUrl.includes('medrxiv') ? 'medRxiv' : 'bioRxiv'
    const papers = await ingestFromFeed(feedUrl, label)
    bioPapers.push(
      ...papers.filter((p) => !p.publishedDate || p.publishedDate >= fortyEightHoursAgo)
    )
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

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // In development, allow without secret
  }

  try {
    console.log('[research-ingest] Starting...')
    const results = await runIngestPipeline()
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
