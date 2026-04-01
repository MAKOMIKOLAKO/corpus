import { prisma } from './prismaWithRetry'
import { ALERT_CONFIG, normalizeTitle } from './alerts'

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

  console.log('[alertProcessor] Starting alert processing...')

  // Fetch all active queries not checked in last 23 hours
  const cutoff = new Date(Date.now() - ALERT_CONFIG.minHoursBetweenChecks * 60 * 60 * 1000)

  console.log(`[alertProcessor] Cutoff time: ${cutoff.toISOString()}`)
  console.log(`[alertProcessor] Checking for active queries...`)

  // First, let's see all queries regardless of activity
  const allQueries = await prisma.watchQuery.findMany({
    select: {
      id: true,
      userId: true,
      query: true,
      isActive: true,
      lastCheckedAt: true,
      user: { select: { plan: true } }
    }
  })

  console.log(`[alertProcessor] Total queries in database: ${allQueries.length}`)
  allQueries.forEach(q => {
    console.log(`  - Query "${q.query}" (User: ${q.userId}, Plan: ${q.user.plan}, Active: ${q.isActive}, Last checked: ${q.lastCheckedAt})`)
  })

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

  if (queries.length > 0) {
    console.log('[alertProcessor] Queries found:')
    queries.forEach(q => {
      console.log(`  - User ${q.userId} (plan: ${q.user.plan}): "${q.query}" (last checked: ${q.lastCheckedAt})`)
    })
  }

  if (queries.length === 0) {
    console.log('[alertProcessor] No queries found. Checking conditions...')
    console.log('[alertProcessor] Cutoff time:', cutoff.toISOString())
  }

  // Process queries sequentially to avoid overwhelming APIs
  for (const query of queries) {
    try {
      // Skip if user is no longer Pro (plan may have expired)
      if (query.user.plan === 'FREE') {
        console.log(`[alertProcessor] Skipping user ${query.user.id} - FREE plan`)
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

  console.log('[alertProcessor] Alert processing complete:', {
    queriesProcessed: results.queriesProcessed,
    totalPapersAdded: results.totalPapersAdded,
    errors: results.errors.length
  })

  if (results.errors.length > 0) {
    console.log('[alertProcessor] Errors encountered:', results.errors)
  }

  return results
}

export async function processQuery(query: {
  id: string
  userId: string
  query: string
  collectionId: string
  maxPapers?: number
}): Promise<number> {
  console.log(`[alertProcessor] Processing query: "${query.query}" for user ${query.userId}`)

  // Step 1: Fetch candidate papers from Semantic Scholar
  const candidates = await fetchCandidatePapers(query.query)
  console.log(`[alertProcessor] Found ${candidates.length} candidate papers`)

  if (candidates.length === 0) {
    console.log(`[alertProcessor] No candidates found for query "${query.query}"`)
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
    existingEntries.map((e: { doi: string | null }) => e.doi).filter(Boolean) as string[]
  )
  const existingTitles = new Set(
    existingEntries.map((e: { title: string }) => normalizeTitle(e.title))
  )

  // Step 3: Filter candidates by relevance using Gemini
  // Process in batches of 5 to avoid rate limits
  const candidatesWithAbstractCount = candidates.filter((paper) => Boolean(paper.abstract)).length
  console.log(`[alertProcessor] ${candidatesWithAbstractCount}/${candidates.length} candidates have abstracts`)

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
      } else if (result.status === 'rejected') {
        console.error(`[alertProcessor] Relevance check failed for paper: ${batch[j].title}`, result.reason)
      }
    }

    // Pause between batches
    if (i + batchSize < candidates.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(`[alertProcessor] ${relevant.length}/${candidates.length} papers deemed relevant after filtering`)


  // Step 4: Always create a container to track this run
  const db = prisma as any
  console.log(`[alertProcessor] Creating container for query run`)

  const container = await db.alertContainer.create({
    data: {
      userId: query.userId,
      watchQueryId: query.id,
      query: query.query,
      collectionId: query.collectionId,
    }
  })

  console.log(`[alertProcessor] Created container ${container.id}`)

  const existingContainerEntries = await db.alertEntry.findMany({
    where: { containerId: container.id },
    select: { externalId: true, title: true },
  })

  const existingContainerExternalIds = new Set(
    existingContainerEntries.map((entry: { externalId: string }) => entry.externalId)
  )
  const existingContainerTitles = new Set(
    existingContainerEntries.map((entry: { title: string }) => normalizeTitle(entry.title))
  )

  let papersAdded = 0
  const stagedAlertEntryIds: string[] = []
  const maxPerRun = Math.max(1, Math.min(query.maxPapers ?? 5, 10))
  console.log(`[alertProcessor] Will stage up to ${maxPerRun} papers from ${relevant.length} relevant ones`)

  for (const paper of relevant.slice(0, maxPerRun)) {
    const externalId = paper.doi || paper.semanticScholarId

    // Deduplication check
    if (paper.doi && existingDOIs.has(paper.doi)) {
      continue
    }
    const normalizedTitle = normalizeTitle(paper.title)
    if (existingTitles.has(normalizedTitle)) {
      continue
    }
    if (existingContainerExternalIds.has(externalId)) {
      continue
    }
    if (existingContainerTitles.has(normalizedTitle)) {
      continue
    }

    try {
      const alertEntry = await db.alertEntry.create({
        data: {
          containerId: container.id,
          externalId,
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          abstract: paper.abstract,
          url: paper.url,
          metadata: {
            doi: paper.doi,
            venue: paper.venue,
            openAccessUrl: paper.openAccessUrl,
            semanticScholarId: paper.semanticScholarId,
          }
        }
      })

      // Track for deduplication within this run
      if (paper.doi) existingDOIs.add(paper.doi)
      existingTitles.add(normalizedTitle)
      existingContainerExternalIds.add(externalId)
      existingContainerTitles.add(normalizedTitle)

      stagedAlertEntryIds.push(alertEntry.id)
      papersAdded++
    } catch (error) {
      console.error(`[alertProcessor] Failed to stage alert entry for: ${paper.title}`, error)
    }
  }

  // Step 5: Always create a notification to show the alert ran
  if (papersAdded > 0) {
    console.log(`[alertProcessor] Creating notification for ${papersAdded} papers`)
    await prisma.notification.create({
      data: {
        userId: query.userId,
        type: 'SMART_ALERT',
        message: `${papersAdded} new paper${papersAdded === 1 ? '' : 's'} ready for review for "${query.query}"`,
        metadata: {
          queryId: query.id,
          containerId: container.id,
          collectionId: query.collectionId,
          paperCount: papersAdded,
          alertEntryIds: stagedAlertEntryIds,
        }
      }
    })
  } else {
    console.log(`[alertProcessor] No new papers to stage for query "${query.query}"`)
    // Still create a notification to show the system ran
    await prisma.notification.create({
      data: {
        userId: query.userId,
        type: 'SMART_ALERT',
        message: `Alert check complete for "${query.query}". No new relevant papers found.`,
        metadata: {
          queryId: query.id,
          containerId: container.id,
          collectionId: query.collectionId,
          paperCount: 0,
          alertEntryIds: [],
        }
      }
    })
  }

  // Step 6: Update lastCheckedAt
  await prisma.watchQuery.update({
    where: { id: query.id },
    data: { lastCheckedAt: new Date() }
  })

  console.log(`[alertProcessor] Query "${query.query}" complete. Added ${papersAdded} papers`)
  return papersAdded
}

async function getOrCreateAlertContainer(query: {
  id: string
  userId: string
  query: string
  collectionId: string
}) {
  const db = prisma as any
  const existingContainer = await db.alertContainer.findFirst({
    where: {
      userId: query.userId,
      watchQueryId: query.id,
      entries: {
        some: { status: 'PENDING' }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (existingContainer) {
    return existingContainer
  }

  return db.alertContainer.create({
    data: {
      userId: query.userId,
      watchQueryId: query.id,
      query: query.query,
      collectionId: query.collectionId,
    }
  })
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
  const semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY?.trim()
  if (!semanticScholarApiKey) {
    throw new Error('SEMANTIC_SCHOLAR_API_KEY is required for smart alerts')
  }

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
        'x-api-key': semanticScholarApiKey,
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
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || ''
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_AI_API_KEY is required for relevance filtering')
    }

    // Use the same pattern as queueProcessor.ts
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: 'text/plain',
        },
      }),
    })

    if (!geminiResponse.ok) {
      console.error('[alertProcessor] Gemini API error:', geminiResponse.status)
      return false
    }

    const geminiData = await geminiResponse.json()
    const answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const isRelevant = answer.trim().toUpperCase() === 'YES'
    return isRelevant
  } catch (error) {
    console.error('[alertProcessor] Gemini relevance check failed:', error)
    console.error('[alertProcessor] Ensure GEMINI_API_KEY or GOOGLE_AI_API_KEY is set and valid')
    return false // Default to not relevant on error
  }
}
