import prisma from './prisma'
import { ALERT_CONFIG, normalizeTitle } from './alerts'
import { GoogleGenAI, Chat } from '@google/genai'

export interface ProcessingResults {
  queriesProcessed: number
  totalPapersAdded: number
  errors: string[]
}

export async function processAllAlerts(): Promise<ProcessingResults> {
  const results: ProcessingResults = {
    queriesProcessed: 0,
    totalPapersAdded: 0,
    errors: []
  }

  // Fetch all active queries not checked in last 23 hours
  const cutoff = new Date(Date.now() - ALERT_CONFIG.minHoursBetweenChecks * 60 * 60 * 1000)

  const queries = await prisma.watchQuery.findMany({
    where: {
      isActive: true,
      OR: [
        { lastCheckedAt: null },
        { lastCheckedAt: { lt: cutoff } }
      ]
    },
    include: {
      user: { select: { id: true, plan: true } }
    }
  })

  console.log(`[alertProcessor] Processing ${queries.length} active queries`)

  // Process queries sequentially to avoid overwhelming APIs
  for (const query of queries) {
    try {
      // Skip if user is no longer Pro (plan may have expired)
      if (query.user.plan === 'FREE') {
        await prisma.watchQuery.update({
          where: { id: query.id },
          data: { isActive: false }
        })
        continue
      }

      const papersAdded = await processQuery(query)
      results.totalPapersAdded += papersAdded
      results.queriesProcessed++

      // Cost control: stop if we've added too many papers
      if (results.totalPapersAdded >= 200) {
        console.warn('[alertProcessor] Reached maximum papers per run (200), stopping')
        break
      }
    } catch (error) {
      const message = `Query ${query.id}: ${(error as Error).message}`
      console.error(`[alertProcessor] ${message}`)
      results.errors.push(message)
      // Continue processing other queries even if one fails
    }

    // Wait 2 seconds between queries to respect API rate limits
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return results
}

export async function processQuery(query: {
  id: string
  userId: string
  query: string
  collectionId: string
}): Promise<number> {
  console.log(`[alertProcessor] Processing query: "${query.query}"`)

  // Step 1: Fetch candidate papers from Semantic Scholar
  const candidates = await fetchCandidatePapers(query.query)
  console.log(`[alertProcessor] Found ${candidates.length} candidates`)

  if (candidates.length === 0) {
    await prisma.watchQuery.update({
      where: { id: query.id },
      data: { lastCheckedAt: new Date() }
    })
    return 0
  }

  // Step 2: Get existing entries for deduplication
  const existingEntries = await prisma.entry.findMany({
    where: { userId: query.userId },
    select: { doi: true, title: true }
  })
  const existingDOIs = new Set(
    existingEntries.map(e => e.doi).filter(Boolean) as string[]
  )
  const existingTitles = new Set(
    existingEntries.map(e => normalizeTitle(e.title))
  )

  // Step 3: Filter candidates by relevance using Gemini
  // Process in batches of 5 to avoid rate limits
  const relevant: typeof candidates = []
  const batchSize = 5

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(paper => checkRelevance(query.query, paper))
    )

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result.status === 'fulfilled' && result.value === true) {
        relevant.push(batch[j])
      }
    }

    // Pause between batches
    if (i + batchSize < candidates.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(`[alertProcessor] ${relevant.length} papers passed relevance check`)

  // Step 4: Deduplicate and create entries
  let papersAdded = 0
  const newEntryIds: string[] = []
  const MAX_ENTRIES_PER_RUN = 10 // max per query per day

  for (const paper of relevant.slice(0, MAX_ENTRIES_PER_RUN)) {
    // Deduplication check
    if (paper.doi && existingDOIs.has(paper.doi)) {
      console.log(`[alertProcessor] Skipping duplicate DOI: ${paper.doi}`)
      continue
    }
    if (existingTitles.has(normalizeTitle(paper.title))) {
      console.log(`[alertProcessor] Skipping duplicate title: ${paper.title}`)
      continue
    }

    try {
      // Create the entry
      const entry = await prisma.entry.create({
        data: {
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          abstract: paper.abstract,
          doi: paper.doi,
          url: paper.url,
          source: 'SMART_ALERT',
          contentType: 'PAPER',
          userId: query.userId,
          readingStatus: 'UNREAD',
          notes: [],
          addedByQueryId: query.id,
          metadata: {
            openAccessUrl: paper.openAccessUrl,
            semanticScholarId: paper.semanticScholarId
          }
        }
      })

      // Increment user entry count
      await prisma.user.update({
        where: { id: query.userId },
        data: { entriesCount: { increment: 1 } }
      })

      // Add to the alert's collection
      await prisma.entryCollection.create({
        data: { entryId: entry.id, collectionId: query.collectionId }
      })

      // Track for deduplication within this run
      if (paper.doi) existingDOIs.add(paper.doi)
      existingTitles.add(normalizeTitle(paper.title))

      newEntryIds.push(entry.id)
      papersAdded++
    } catch (error) {
      console.error(`[alertProcessor] Failed to create entry for: ${paper.title}`, error)
    }
  }

  // Step 5: Create notification if papers were added
  if (papersAdded > 0) {
    await prisma.notification.create({
      data: {
        userId: query.userId,
        type: 'SMART_ALERT',
        message: `${papersAdded} new paper${papersAdded === 1 ? '' : 's'} added for "${query.query}"`,
        metadata: {
          queryId: query.id,
          collectionId: query.collectionId,
          paperCount: papersAdded,
          entryIds: newEntryIds
        }
      }
    })
  }

  // Step 6: Update lastCheckedAt
  await prisma.watchQuery.update({
    where: { id: query.id },
    data: { lastCheckedAt: new Date() }
  })

  return papersAdded
}

interface CandidatePaper {
  semanticScholarId: string
  title: string
  authors: string[]
  year: number | null
  abstract: string | null
  doi: string | null
  url: string
  venue: string | null
  openAccessUrl: string | null
}

async function fetchCandidatePapers(
  query: string
): Promise<CandidatePaper[]> {
  // Calculate date range for recent papers
  const daysBack = ALERT_CONFIG.semanticScholarDaysBack
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - daysBack)
  const fromDateStr = fromDate.toISOString().split('T')[0] // YYYY-MM-DD

  const url = new URL(
    'https://api.semanticscholar.org/graph/v1/paper/search'
  )
  url.searchParams.set('query', query)
  url.searchParams.set('limit', String(ALERT_CONFIG.maxCandidatesPerQuery))
  url.searchParams.set(
    'fields',
    'paperId,title,authors,year,abstract,venue,externalIds,openAccessPdf,publicationDate'
  )
  // Filter to recent papers using publicationDate
  url.searchParams.set('publicationDateOrYear', `${fromDateStr}:`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY || '',
        'Accept': 'application/json'
      },
      signal: controller.signal
    })
    clearTimeout(timeout)

    if (response.status === 429) {
      console.warn('[alertProcessor] Semantic Scholar rate limit hit')
      return []
    }
    if (!response.ok) {
      console.error('[alertProcessor] Semantic Scholar error:', response.status)
      return []
    }

    const data = await response.json()

    return (data.data || []).map((paper: any): CandidatePaper => ({
      semanticScholarId: paper.paperId,
      title: paper.title || 'Untitled',
      authors: (paper.authors || []).map((a: any) => a.name),
      year: paper.year || null,
      abstract: paper.abstract || null,
      doi: paper.externalIds?.DOI || null,
      url: paper.externalIds?.DOI
        ? `https://doi.org/${paper.externalIds.DOI}`
        : `https://www.semanticscholar.org/paper/${paper.paperId}`,
      venue: paper.venue || null,
      openAccessUrl: paper.openAccessPdf?.url || null
    }))
  } catch (error) {
    clearTimeout(timeout)
    if ((error as any).name === 'AbortError') {
      console.error('[alertProcessor] Semantic Scholar request timed out')
    } else {
      console.error('[alertProcessor] Semantic Scholar fetch failed:', error)
    }
    return []
  }
}

async function checkRelevance(
  userQuery: string,
  paper: CandidatePaper
): Promise<boolean> {
  if (!paper.abstract) {
    // No abstract — use title only with lower confidence
    // Default to false for papers without abstracts
    return false
  }

  const prompt = `You are a research paper relevance classifier.

User's research interest: "${userQuery}"

Paper title: "${paper.title}"
Paper abstract: "${paper.abstract.slice(0, 800)}"

Is this paper directly relevant to the user's research interest?
Answer with only YES or NO. No explanation.`

  try {
    // Use existing Gemini client pattern from the codebase
    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '',
    })
    const chat = new Chat((genAI as any).models.apiClient, genAI.models, 'gemini-1.5-flash')

    const result = await chat.sendMessage({ message: prompt })
    const answer = result.text?.trim()?.toUpperCase()

    return answer === 'YES'
  } catch (error) {
    console.error('[alertProcessor] Gemini relevance check failed:', error)
    return false // Default to not relevant on error
  }
}
