import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import prisma from '@/lib/prisma'
import { isPro } from '@/lib/plans'
import { embedText } from '@/lib/research/embeddings'
import { cosineSimilarity } from '@/lib/research/embeddings'
import { Prisma } from '@prisma/client'

type SearchCandidateRow = {
  id: string
  title: string
  authors: string[]
  abstract: string | null
  url: string | null
  source: string | null
  publishedDate: Date | null
  doi: string | null
  arxivId: string | null
  plainSummary: string | null
  embeddingText: string | null
}

function parseVectorText(value: string | null): number[] | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null
  const body = trimmed.slice(1, -1)
  if (!body) return null
  const parsed = body.split(',').map((x) => Number(x.trim()))
  if (parsed.some((n) => !Number.isFinite(n))) return null
  return parsed
}

interface SearchRequest {
  query?: string
  filters?: {
    dateRange?: '24h' | '7d' | '30d' | 'any'
    sources?: ('alerts' | 'rss' | 'saved' | 'arxiv' | 'pubmed' | 'semantic_scholar')[]
    domains?: string[]
    minScore?: number
  }
  limit?: number
  cursor?: string
}

interface SearchResult {
  candidatePaperId: string
  globalEntryId: string | null
  title: string
  authors: string[]
  year: number | null
  publishedDate: string | null
  source: string | null
  doi: string | null
  url: string | null
  plainSummary: string | null
  compositeScore: number
  scoreBreakdown: {
    keywordScore: number
    semanticScore: number
    alertScore: number
    historyScore: number
  }
  sourceLabel: string
  alreadySaved: boolean
  sessionExists: boolean
  whyExplanation: string | null
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, plan: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Pro gating for full corpus search
  if (!isPro(user.plan)) {
    // Free users only see their saved library entries
    const body: SearchRequest = await request.json()
    const { query, limit = 20 } = body

    const userEntries = await prisma.userEntry.findMany({
      where: { userId: user.id },
      include: {
        globalEntry: true,
      },
      take: limit,
    })

    const results: SearchResult[] = userEntries.map((ue) => ({
      candidatePaperId: ue.globalEntryId,
      globalEntryId: ue.globalEntryId,
      title: ue.globalEntry.title,
      authors: ue.globalEntry.authors,
      year: ue.globalEntry.publicationYear,
      publishedDate: ue.globalEntry.createdAt?.toISOString() || null,
      source: ue.globalEntry.source,
      doi: ue.globalEntry.doi,
      url: ue.globalEntry.url,
      plainSummary: ue.globalEntry.summary,
      compositeScore: 1.0,
      scoreBreakdown: {
        keywordScore: 0,
        semanticScore: 0,
        alertScore: 0,
        historyScore: 1.0,
      },
      sourceLabel: 'In your library',
      alreadySaved: true,
      sessionExists: false,
      whyExplanation: null,
    }))

    // Filter by query if provided
    const filteredResults = query
      ? results.filter((r) =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        (r.plainSummary && r.plainSummary.toLowerCase().includes(query.toLowerCase()))
      )
      : results

    return NextResponse.json({
      results: filteredResults,
      totalCount: filteredResults.length,
      hasMore: false,
    })
  }

  // Pro users get full hybrid search
  const body: SearchRequest = await request.json()
  const { query = '', filters = {}, limit = 20 } = body

  // If no query, return today's daily brief (empty state)
  if (!query.trim()) {
    // This should be handled by the client calling the feed endpoint instead
    return NextResponse.json({
      results: [],
      totalCount: 0,
      hasMore: false,
    })
  }

  try {
    // Step 1: Get user's watch queries for alert scoring
    const watchQueries = await prisma.watchQuery.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, query: true },
    })

    // Step 2: Get user's saved entries for history scoring (by DOI for cross-model matching)
    const userEntries = await prisma.userEntry.findMany({
      where: { userId: user.id },
      include: { globalEntry: { select: { id: true, doi: true } } },
    })
    const savedGlobalEntryIds = new Set(userEntries.map((ue) => ue.globalEntry.id))
    const savedDois = new Set(userEntries.map((ue) => ue.globalEntry.doi).filter(Boolean) as string[])

    // Step 3: Get user's RSS subscriptions for feed scoring
    const userSources = await prisma.userSource.findMany({
      where: { userId: user.id },
      select: { sourceId: true },
    })
    const subscribedSourceIds = new Set(userSources.map((us) => us.sourceId))

    // Step 4: Get all CandidatePapers with embeddings
    const candidateRows = await prisma.$queryRaw<SearchCandidateRow[]>(Prisma.sql`
      SELECT
        cp."id",
        cp."title",
        cp."authors",
        cp."abstract",
        cp."url",
        cp."source",
        cp."publishedDate",
        cp."doi",
        cp."arxivId",
        cp."plainSummary",
        cp."embedding"::text AS "embeddingText"
      FROM "CandidatePaper" cp
      WHERE cp."embeddedAt" IS NOT NULL
      ORDER BY cp."ingestedAt" DESC
      LIMIT 500
    `)

    const candidatePapers = candidateRows.map((paper) => ({
      ...paper,
      embedding: parseVectorText(paper.embeddingText),
    }))

    // Step 5: Run keyword and semantic search in parallel
    const queryLower = query.toLowerCase()

    // Keyword scoring (BM25-style)
    const keywordScores = new Map<string, number>()
    candidatePapers.forEach((paper) => {
      const titleLower = paper.title.toLowerCase()
      const abstractLower = (paper.abstract || '').toLowerCase()
      const combinedText = `${titleLower} ${abstractLower}`

      const queryTerms = queryLower.split(/\s+/)
      let score = 0
      queryTerms.forEach((term) => {
        const titleMatches = (titleLower.match(new RegExp(term, 'g')) || []).length
        const abstractMatches = (abstractLower.match(new RegExp(term, 'g')) || []).length
        score += titleMatches * 2 + abstractMatches // Title matches weighted higher
      })

      // Normalize to 0-1
      keywordScores.set(paper.id, Math.min(score / 10, 1))
    })

    // Semantic scoring (embedding similarity)
    const semanticScores = new Map<string, number>()
    const queryEmbedding = await embedText(query)

    candidatePapers.forEach((paper) => {
      if (paper.embedding && Array.isArray(paper.embedding)) {
        const similarity = cosineSimilarity(queryEmbedding, paper.embedding as number[])
        semanticScores.set(paper.id, similarity)
      }
    })

    // Alert scoring
    const alertScores = new Map<string, number>()
    candidatePapers.forEach((paper) => {
      let score = 0
      watchQueries.forEach((wq) => {
        const queryTokens = new Set(wq.query.toLowerCase().split(/\s+/))
        const paperTokens = new Set(paper.title.toLowerCase().split(/\s+/))
        const intersection = new Set(Array.from(queryTokens).filter((x) => paperTokens.has(x)))
        const union = new Set([...Array.from(queryTokens), ...Array.from(paperTokens)])
        const jaccard = intersection.size / union.size

        if (jaccard > 0.3) {
          score += jaccard
        }
      })
      alertScores.set(paper.id, Math.min(score, 1.0))
    })

    // History scoring
    const historyScores = new Map<string, number>()
    candidatePapers.forEach((paper) => {
      // Check if paper is in user's saved library (negative boost for already-saved)
      const isSaved = savedDois.has(paper.doi ?? '') || savedGlobalEntryIds.has(paper.id)
      if (isSaved) {
        historyScores.set(paper.id, -0.1)
      } else {
        historyScores.set(paper.id, 0)
      }
    })

    // Step 6: Calculate composite scores
    const scoredPapers = candidatePapers.map((paper) => {
      const keywordScore = keywordScores.get(paper.id) || 0
      const semanticScore = semanticScores.get(paper.id) || 0
      const alertScore = alertScores.get(paper.id) || 0
      const historyScore = historyScores.get(paper.id) || 0

      const compositeScore =
        keywordScore * 0.3 +
        semanticScore * 0.45 +
        alertScore * 0.15 +
        historyScore * 0.1

      return {
        paper,
        compositeScore,
        scoreBreakdown: {
          keywordScore,
          semanticScore,
          alertScore,
          historyScore,
        },
      }
    })

    // Step 7: Apply filters
    let filteredPapers = scoredPapers

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'any') {
      const now = new Date()
      const cutoffDate = new Date()
      if (filters.dateRange === '24h') {
        cutoffDate.setHours(now.getHours() - 24)
      } else if (filters.dateRange === '7d') {
        cutoffDate.setDate(now.getDate() - 7)
      } else if (filters.dateRange === '30d') {
        cutoffDate.setDate(now.getDate() - 30)
      }

      filteredPapers = filteredPapers.filter((sp) =>
        sp.paper.publishedDate && new Date(sp.paper.publishedDate) >= cutoffDate
      )
    }

    // Minimum score filter
    if (filters.minScore !== undefined && filters.minScore !== null) {
      filteredPapers = filteredPapers.filter((sp) => sp.compositeScore >= filters.minScore!)
    }

    // Step 8: Sort and paginate
    filteredPapers.sort((a, b) => b.compositeScore - a.compositeScore)

    const paginatedPapers = filteredPapers.slice(0, limit)

    // Step 9: Build response with source labels
    const results: SearchResult[] = paginatedPapers.map((sp, index) => {
      const { paper, compositeScore, scoreBreakdown } = sp

      // Determine source label
      let sourceLabel = 'Search result'
      const isSaved = savedDois.has(paper.doi ?? '') || savedGlobalEntryIds.has(paper.id)
      if (isSaved) {
        sourceLabel = 'In your library'
      } else if (scoreBreakdown.alertScore > 0.3) {
        sourceLabel = 'Alert match'
      }

      // Generate why explanation only for top 10
      let whyExplanation: string | null = null
      if (index < 10) {
        if (scoreBreakdown.semanticScore > 0.7) {
          whyExplanation = 'High semantic similarity to your query based on abstract content.'
        } else if (scoreBreakdown.alertScore > 0.5) {
          whyExplanation = 'Matches your research alert queries.'
        } else if (scoreBreakdown.keywordScore > 0.5) {
          whyExplanation = 'Contains keywords matching your search terms.'
        } else {
          whyExplanation = 'Relevant based on combined semantic and keyword analysis.'
        }
      }

      // Map to actual GlobalEntry if one exists
      const matchingGlobalEntry = userEntries.find(ue => ue.globalEntry.doi === paper.doi && paper.doi)

      return {
        candidatePaperId: paper.id,
        globalEntryId: matchingGlobalEntry?.globalEntry.id ?? null,
        title: paper.title,
        authors: paper.authors,
        year: paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : null,
        publishedDate: paper.publishedDate?.toISOString() || null,
        source: paper.source,
        doi: paper.doi,
        url: paper.url,
        plainSummary: paper.plainSummary,
        compositeScore,
        scoreBreakdown,
        sourceLabel,
        alreadySaved: isSaved,
        sessionExists: false, // TODO: Check if reading session exists
        whyExplanation,
      }
    })

    return NextResponse.json({
      results,
      totalCount: filteredPapers.length,
      hasMore: filteredPapers.length > limit,
    })
  } catch (error) {
    console.error('[search-api] Error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
