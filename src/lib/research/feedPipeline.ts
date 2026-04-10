/**
 * Feed Pipeline — Online portion (Steps 5-10 from the spec).
 * Orchestrates: scoring → filtering → clustering → selection → summarization.
 * Called when a user visits /research and no cached DailyBrief exists.
 */

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { cosineSimilarity, embedBatch, buildPaperEmbeddingText } from './embeddings'
import {
  computeSemanticScore,
  computeDomainScore,
  computeNoveltyScore,
  computeCitationScore,
  computeEngagementScore,
  computeCompositeScore,
  computeP95Velocity,
  type SubScores,
} from './scoring'
import { clusterPapers, getPapersNearestToCentroid, type ClusterResult } from './clustering'
import { getOrCreateProfile, recomputeUserProfile, buildUserContext } from './interestProfile'
import {
  labelCluster,
  generatePaperSummaries,
  generateWhyExplanation,
  generateEmergingTrends,
  type PaperMetadata,
} from './geminiResearch'

export interface DailyFeedResponse {
  date: string
  userId: string
  preferredCount: number
  actualCount: number
  emergingTrends: string | null
  papers: PaperSummaryObject[]
  clusters: ClusterObject[]
  generatedAt: string
  fromCache: boolean
}

export interface PaperSummaryObject {
  candidatePaperId: string
  globalEntryId: string | null
  title: string
  authors: string[]
  year: number | null
  publishedDate: string | null
  source: string | null
  doi: string | null
  url: string | null
  plainSummary: string
  technicalSummary: string
  whyExplanation: string
  noveltyTag: string
  compositeScore: number
  scoreBreakdown: SubScores
  clusterLabel: string
  alreadySaved: boolean
  openAccessUrl: string | null
}

export interface ClusterObject {
  clusterIndex: number
  label: string
  paperCount: number
  representativePaperIds: string[]
}

/** Truncated UTC date for DailyBrief deduplication (midnight UTC). */
function todayUTC(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Check if a cached DailyBrief already exists for the user today.
 * Returns serialized DailyFeedResponse if found, null otherwise.
 */
export async function getDailyBriefCached(userId: string): Promise<DailyFeedResponse | null> {
  const today = todayUTC()
  const brief = await prisma.dailyBrief.findUnique({
    where: { userId_date: { userId, date: today } },
  })
  if (!brief) return null

  // Load full paper data from CandidatePaper
  const papers = await prisma.candidatePaper.findMany({
    where: { id: { in: brief.selectedPaperIds } },
  })

  const paperMap = new Map(papers.map((p) => [p.id, p]))

  // Load clusters for today
  const clusters = await prisma.dailyCluster.findMany({
    where: { userId, date: today },
    orderBy: { clusterIndex: 'asc' },
  })

  // Check which papers the user has already saved (by DOI)
  const savedDois = await getUserSavedDois(userId)
  const savedPaperIds = await getUserSavedCandidateIds(userId)

  const whyExplanations = brief.whyExplanations as Record<string, string>

  // Build cluster label lookup per paper
  const paperClusterLabel = new Map<string, string>()
  for (const cluster of clusters) {
    for (const pid of cluster.paperIds as string[]) {
      paperClusterLabel.set(pid, cluster.label)
    }
  }

  const paperObjects: PaperSummaryObject[] = brief.selectedPaperIds
    .map((pid) => {
      const p = paperMap.get(pid)
      if (!p) return null
      const meta = p.candidateMetadata as { openAccessUrl?: string } | null

      return {
        candidatePaperId: p.id,
        globalEntryId: null,
        title: p.title,
        authors: p.authors,
        year: p.publishedDate?.getFullYear() ?? null,
        publishedDate: p.publishedDate?.toISOString() ?? null,
        source: p.source,
        doi: p.doi,
        url: p.url,
        plainSummary: p.plainSummary ?? '',
        technicalSummary: p.technicalSummary ?? '',
        whyExplanation: whyExplanations[pid] ?? '',
        noveltyTag: p.noveltyTag ?? 'New method',
        compositeScore: 0, // cached brief doesn't store scores; use 0
        scoreBreakdown: { semantic: 0, domain: 0, novelty: 0, citation: 0, engagement: 0 },
        clusterLabel: paperClusterLabel.get(pid) ?? '',
        alreadySaved: savedDois.has(p.doi ?? '') || savedPaperIds.has(p.id),
        openAccessUrl: meta?.openAccessUrl ?? null,
      } satisfies PaperSummaryObject
    })
    .filter(Boolean) as PaperSummaryObject[]

  const clusterObjects: ClusterObject[] = clusters.map((c) => ({
    clusterIndex: c.clusterIndex,
    label: c.label,
    paperCount: (c.paperIds as string[]).length,
    representativePaperIds: (c.paperIds as string[]).slice(0, 3),
  }))

  return {
    date: today.toISOString().split('T')[0],
    userId,
    preferredCount: 5,
    actualCount: paperObjects.length,
    emergingTrends: brief.emergingTrendsParagraph,
    papers: paperObjects,
    clusters: clusterObjects,
    generatedAt: brief.generatedAt.toISOString(),
    fromCache: true,
  }
}

/**
 * Run the full online pipeline for a user.
 * Steps: scoring → filtering → clustering → selection → summarization → save.
 */
export async function generateDailyBrief(
  userId: string
): Promise<DailyFeedResponse> {
  const today = todayUTC()

  // Get user profile with feed selection preferences
  const profile = await getOrCreateProfile(userId)
  const mode = (profile.feedSelectionMode as 'profile' | 'collection' | 'phrase') || 'profile'
  const collectionId = profile.feedSelectionCollectionId || null
  const phrase = profile.feedSelectionPhrase || null

  // Determine interest vector based on selection mode
  let interestVector: number[] | null = null
  let domainWeights: Record<string, number> = {}
  let dismissedIds = new Set<string>()
  let preferredCount = profile.preferredDailyCount ?? 5

  if (mode === 'collection' && collectionId) {
    // Collection-based: compute interest vector from papers in the collection
    const collectionPapers = await prisma.userEntryCollection.findMany({
      where: {
        collectionId,
        userEntry: {
          userId,
        },
      },
      include: {
        userEntry: {
          include: {
            globalEntry: {
              select: {
                title: true,
                abstract: true,
              },
            },
          },
        },
      },
      take: 100,
    })

    if (collectionPapers.length > 0) {
      const texts = collectionPapers
        .filter(p => p.userEntry.globalEntry.abstract)
        .map(p => buildPaperEmbeddingText(p.userEntry.globalEntry.title, p.userEntry.globalEntry.abstract))

      if (texts.length > 0) {
        const embeddings = await embedBatch(texts)
        // Average the embeddings to create a collection interest vector
        const sumVector = new Array(embeddings[0]?.length || 0).fill(0)
        let count = 0
        for (const emb of embeddings) {
          if (emb) {
            for (let i = 0; i < emb.length; i++) {
              sumVector[i] += emb[i]
            }
            count++
          }
        }
        if (count > 0) {
          interestVector = sumVector.map(v => v / count)
        }
      }
    }

    dismissedIds = new Set(profile.dismissedPaperIds)
  } else if (mode === 'phrase' && phrase) {
    // Phrase-based: compute interest vector from the research phrase
    const embedding = await embedBatch([buildPaperEmbeddingText(phrase, phrase)])
    interestVector = embedding[0] || null

    dismissedIds = new Set(profile.dismissedPaperIds)
  } else {
    // Profile-based: use user's computed profile
    if (!profile.interestVector || !profile.lastRecomputedAt) {
      await recomputeUserProfile(userId)
      const updatedProfile = await getOrCreateProfile(userId)
      interestVector = updatedProfile.interestVector as number[] | null
      domainWeights = (updatedProfile.domainWeights as Record<string, number>) ?? {}
    } else {
      interestVector = profile.interestVector as number[] | null
      domainWeights = (profile.domainWeights as Record<string, number>) ?? {}
    }

    dismissedIds = new Set(profile.dismissedPaperIds)
  }

  // Fetch candidate papers from last 7 days that have been embedded
  // Only include arXiv and bioRxiv/medRxiv papers, exclude user RSS feeds
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const candidates = await prisma.candidatePaper.findMany({
    where: {
      embeddedAt: { not: null },
      publishedDate: { gte: sevenDaysAgo },
      OR: [
        { source: { startsWith: 'arXiv:' } },
        { source: { equals: 'bioRxiv' } },
        { source: { equals: 'medRxiv' } },
      ],
    },
    orderBy: { publishedDate: 'desc' },
    take: 5000,
  })

  if (candidates.length === 0) {
    return buildEmptyBrief(userId, today, preferredCount, 'No embedded papers found for the past 7 days.')
  }

  // Get user's saved DOIs and papers for deduplication
  const savedDois = await getUserSavedDois(userId)
  const savedPaperIds = await getUserSavedCandidateIds(userId)

  // Get user's 50 most recent GlobalEntry embeddings for novelty computation
  const recentLibraryEmbeddings = await getRecentLibraryEmbeddings(userId)

  // Get user's recent entry titles for context
  const recentEntryTitles = await getRecentEntryTitles(userId, 5)

  // Compute p95 citation velocity across today's corpus
  const p95Velocity = computeP95Velocity(
    candidates.map((c) => ({
      citationCount: (c.candidateMetadata as Record<string, number> | null)?.citationCount ?? null,
      publishedDate: c.publishedDate,
    }))
  )

  // Step 5: Score all candidates
  const scored: Array<{
    candidate: typeof candidates[0]
    subScores: SubScores
    composite: number
  }> = []

  for (const c of candidates) {
    const embedding = c.embedding as number[] | null
    if (!embedding) continue

    // Step 6: Filter
    if (dismissedIds.has(c.id)) continue
    if (savedDois.has(c.doi ?? '')) continue
    if (savedPaperIds.has(c.id)) continue

    const meta = c.candidateMetadata as PaperMetadata | null

    const semantic = interestVector
      ? computeSemanticScore(embedding, interestVector)
      : 0.5

    const domain = computeDomainScore(meta?.domainTags ?? [], domainWeights)

    const novelty = computeNoveltyScore(
      embedding,
      c.publishedDate,
      recentLibraryEmbeddings
    )

    const citation = computeCitationScore(
      (c.candidateMetadata as Record<string, number> | null)?.citationCount ?? null,
      c.publishedDate,
      p95Velocity
    )

    const engagement = computeEngagementScore(0, 0) // Cohort < 5 for new system

    const subScores: SubScores = { semantic, domain, novelty, citation, engagement }
    const composite = computeCompositeScore(subScores, true) // small cohort

    // Filter below threshold
    if (composite < 0.25) continue

    scored.push({ candidate: c, subScores, composite })
  }

  // Sort and take top 100
  scored.sort((a, b) => b.composite - a.composite)
  const top100 = scored.slice(0, 100)

  if (top100.length < 3) {
    return buildEmptyBrief(
      userId,
      today,
      preferredCount,
      `Only ${top100.length} relevant papers found today — insufficient for a brief.`
    )
  }

  // Step 7: Clustering
  const papersForClustering = top100
    .map((item) => ({
      id: item.candidate.id,
      embedding: item.candidate.embedding as number[],
    }))
    .filter((p) => p.embedding != null)

  const clusters = clusterPapers(papersForClustering, 8, 12)

  // Step 8: Diversity-aware selection
  const selected = diversitySelect(top100, clusters, preferredCount)

  // Step 9: Summarization — label clusters + generate summaries + why explanations
  const clusterLabels = await labelClusters(clusters, top100)

  // Generate or retrieve summaries for selected papers
  const summaryResults = await Promise.allSettled(
    selected.map((item) => ensurePaperSummaries(item.candidate))
  )

  // Build why explanations
  const userCtx = buildUserContext(domainWeights, recentEntryTitles)
  const whyResults = await Promise.allSettled(
    selected.map((item) =>
      generateWhyExplanation(
        {
          title: item.candidate.title,
          abstract: item.candidate.abstract,
          candidateMetadata: item.candidate.candidateMetadata as PaperMetadata | null,
        },
        userCtx
      )
    )
  )

  // Emerging trends
  const selectedTitles = selected.map((s) => s.candidate.title)
  const allClusterLabels = Object.values(clusterLabels)
  let emergingTrends: string | null = null
  try {
    emergingTrends = await generateEmergingTrends(allClusterLabels, selectedTitles)
  } catch (err) {
    console.error('[feedPipeline] Emerging trends generation failed:', err)
  }

  // Build cluster label lookup per candidatePaperId
  const paperToClusterLabel = new Map<string, string>()
  for (const cluster of clusters) {
    const label = clusterLabels[cluster.clusterIndex] ?? `Topic ${cluster.clusterIndex + 1}`
    for (const pid of cluster.paperIds) {
      paperToClusterLabel.set(pid, label)
    }
  }

  // Build output objects
  const whyExplanations: Record<string, string> = {}
  const paperObjects: PaperSummaryObject[] = []

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i]
    const p = item.candidate

    const summaryResult = summaryResults[i]
    const summaries =
      summaryResult.status === 'fulfilled'
        ? summaryResult.value
        : { plainSummary: p.plainSummary ?? '', technicalSummary: p.technicalSummary ?? '', noveltyTag: p.noveltyTag ?? 'New method' }

    const whyResult = whyResults[i]
    const why =
      whyResult.status === 'fulfilled'
        ? whyResult.value
        : 'This paper is relevant to your research interests.'

    whyExplanations[p.id] = why

    const meta = p.candidateMetadata as (PaperMetadata & { openAccessUrl?: string }) | null

    paperObjects.push({
      candidatePaperId: p.id,
      globalEntryId: null,
      title: p.title,
      authors: p.authors,
      year: p.publishedDate?.getFullYear() ?? null,
      publishedDate: p.publishedDate?.toISOString() ?? null,
      source: p.source,
      doi: p.doi,
      url: p.url,
      plainSummary: summaries.plainSummary,
      technicalSummary: summaries.technicalSummary,
      whyExplanation: why,
      noveltyTag: summaries.noveltyTag,
      compositeScore: item.composite,
      scoreBreakdown: item.subScores,
      clusterLabel: paperToClusterLabel.get(p.id) ?? '',
      alreadySaved: savedDois.has(p.doi ?? '') || savedPaperIds.has(p.id),
      openAccessUrl: meta?.openAccessUrl ?? null,
    })
  }

  // Step 9: Save DailyBrief
  const clusterObjects: ClusterObject[] = clusters.map((c) => ({
    clusterIndex: c.clusterIndex,
    label: clusterLabels[c.clusterIndex] ?? `Topic ${c.clusterIndex + 1}`,
    paperCount: c.paperIds.length,
    representativePaperIds: c.paperIds.slice(0, 3),
  }))

  // Save clusters
  await Promise.allSettled(
    clusters.map((c) =>
      prisma.dailyCluster.upsert({
        where: { userId_date_clusterIndex: { userId, date: today, clusterIndex: c.clusterIndex } },
        create: {
          userId,
          date: today,
          clusterIndex: c.clusterIndex,
          label: clusterLabels[c.clusterIndex] ?? `Topic ${c.clusterIndex + 1}`,
          centroid: c.centroid as unknown as Prisma.InputJsonValue,
          paperIds: c.paperIds,
        },
        update: {
          label: clusterLabels[c.clusterIndex] ?? `Topic ${c.clusterIndex + 1}`,
          centroid: c.centroid as unknown as Prisma.InputJsonValue,
          paperIds: c.paperIds,
        },
      })
    )
  )

  // Save DailyBrief
  const brief = await prisma.dailyBrief.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      selectedPaperIds: selected.map((s) => s.candidate.id),
      whyExplanations: whyExplanations as unknown as Prisma.InputJsonValue,
      emergingTrendsParagraph: emergingTrends,
      generatedAt: new Date(),
    },
    update: {
      selectedPaperIds: selected.map((s) => s.candidate.id),
      whyExplanations: whyExplanations as unknown as Prisma.InputJsonValue,
      emergingTrendsParagraph: emergingTrends,
      generatedAt: new Date(),
    },
  })

  return {
    date: today.toISOString().split('T')[0],
    userId,
    preferredCount,
    actualCount: paperObjects.length,
    emergingTrends,
    papers: paperObjects,
    clusters: clusterObjects,
    generatedAt: brief.generatedAt.toISOString(),
    fromCache: false,
  }
}

// ===== Helpers =====

function buildEmptyBrief(
  userId: string,
  today: Date,
  preferredCount: number,
  message: string
): DailyFeedResponse {
  console.warn(`[feedPipeline] Empty brief for ${userId}: ${message}`)
  return {
    date: today.toISOString().split('T')[0],
    userId,
    preferredCount,
    actualCount: 0,
    emergingTrends: null,
    papers: [],
    clusters: [],
    generatedAt: new Date().toISOString(),
    fromCache: false,
  }
}

async function getUserSavedDois(userId: string): Promise<Set<string>> {
  const entries = await prisma.userEntry.findMany({
    where: { userId },
    include: { globalEntry: { select: { doi: true } } },
  })
  return new Set(entries.map((e) => e.globalEntry.doi).filter(Boolean) as string[])
}

async function getUserSavedCandidateIds(userId: string): Promise<Set<string>> {
  // CandidatePapers saved via research feed (linked by DOI match)
  // We track these via DailyBrief.selectedPaperIds that the user dismissed or saved
  return new Set<string>()
}

async function getRecentLibraryEmbeddings(userId: string): Promise<number[][]> {
  // We don't store GlobalEntry embeddings yet (no pgvector).
  // Return empty array — novelty will use the neutral default.
  // In Pass 2, this will use computed embeddings stored on GlobalEntry.
  return []
}

async function getRecentEntryTitles(userId: string, limit: number): Promise<string[]> {
  const entries = await prisma.userEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { globalEntry: { select: { title: true } } },
  })
  return entries.map((e) => e.globalEntry.title).filter(Boolean)
}

/**
 * Diversity-aware round-robin selection from clusters.
 * Enforces: no shared primary authors, no near-duplicate embeddings (sim > 0.92),
 * at least one "new method/dataset/SOTA" paper.
 */
function diversitySelect(
  scored: Array<{
    candidate: {
      id: string
      title: string
      authors: string[]
      abstract: string | null
      source: string | null
      doi: string | null
      url: string | null
      publishedDate: Date | null
      embedding: unknown
      candidateMetadata: unknown
      plainSummary: string | null
      technicalSummary: string | null
      noveltyTag: string | null
    }
    subScores: SubScores
    composite: number
  }>,
  clusters: ClusterResult[],
  targetCount: number
): typeof scored {
  const smoothedTarget = Math.min(10, Math.max(3, targetCount))

  // Map paperId → scored item
  const scoredMap = new Map(scored.map((s) => [s.candidate.id, s]))

  // Sort clusters by highest scoring paper in each
  const clustersSorted = [...clusters].sort((a, b) => {
    const bestA = Math.max(
      0,
      ...a.paperIds.map((id) => scoredMap.get(id)?.composite ?? 0)
    )
    const bestB = Math.max(
      0,
      ...b.paperIds.map((id) => scoredMap.get(id)?.composite ?? 0)
    )
    return bestB - bestA
  })

  // Filter: skip clusters where top paper semantic sim < 0.35
  const viableClusters = clustersSorted.filter((c) => {
    const best = c.paperIds
      .map((id) => scoredMap.get(id))
      .filter(Boolean)
      .sort((a, b) => b!.composite - a!.composite)[0]
    return (best?.subScores.semantic ?? 0) >= 0.35
  })

  const selected: typeof scored = []
  const selectedAuthors = new Set<string>()
  const selectedEmbeddings: number[][] = []

  // Track how many times each cluster has contributed
  const clusterContributions = new Map(viableClusters.map((c) => [c.clusterIndex, 0]))

  // Papers in cluster ordered by score (pre-sorted)
  const clusterPaperQueues = new Map(
    viableClusters.map((c) => [
      c.clusterIndex,
      c.paperIds
        .map((id) => scoredMap.get(id))
        .filter(Boolean)
        .sort((a, b) => b!.composite - a!.composite) as typeof scored,
    ])
  )

  // Round-robin until target reached
  let round = 0
  const MAX_ROUNDS = 5
  while (selected.length < smoothedTarget && round < MAX_ROUNDS) {
    let anyAdded = false
    for (const cluster of viableClusters) {
      if (selected.length >= smoothedTarget) break
      const queue = clusterPaperQueues.get(cluster.clusterIndex) ?? []
      const contributedSoFar = clusterContributions.get(cluster.clusterIndex) ?? 0

      const candidate = queue[contributedSoFar]
      if (!candidate) continue

      // Hard rule: no shared primary authors
      const primaryAuthor = candidate.candidate.authors[0]?.toLowerCase() ?? ''
      if (primaryAuthor && selectedAuthors.has(primaryAuthor)) continue

      // Hard rule: no near-duplicate embeddings (cosine > 0.92)
      const emb = candidate.candidate.embedding as number[] | null
      if (emb) {
        const isDuplicate = selectedEmbeddings.some(
          (se) => cosineSimilarity(se, emb) > 0.92
        )
        if (isDuplicate) continue
        selectedEmbeddings.push(emb)
      }

      selected.push(candidate)
      if (primaryAuthor) selectedAuthors.add(primaryAuthor)
      clusterContributions.set(cluster.clusterIndex, contributedSoFar + 1)
      anyAdded = true
    }

    if (!anyAdded) break
    round++
  }

  // Hard rule: at least one "new" paper unless none available
  const hasNewPaper = selected.some((s) => {
    const tag = s.candidate.candidateMetadata as { noveltyTag?: string } | null
    return ['New method', 'New dataset', 'State-of-the-art result'].includes(
      tag?.noveltyTag ?? ''
    )
  })

  if (!hasNewPaper) {
    // Try to swap in one "new" paper from the remaining top 100
    // (not in selected)
    const selectedIds = new Set(selected.map((s) => s.candidate.id))
    const newPaper = scored.find(
      (s) =>
        !selectedIds.has(s.candidate.id) &&
        ['New method', 'New dataset', 'State-of-the-art result'].includes(
          (s.candidate.candidateMetadata as { noveltyTag?: string } | null)?.noveltyTag ?? ''
        )
    )
    if (newPaper && selected.length >= 3) {
      selected[selected.length - 1] = newPaper // replace last
    }
  }

  return selected
}

/**
 * Generate summarization for all clusters (label them via Gemini).
 */
async function labelClusters(
  clusters: ClusterResult[],
  scored: Array<{ candidate: { id: string; title: string; abstract: string | null }, composite: number }>
): Promise<Record<number, string>> {
  const labels: Record<number, string> = {}

  // Build a map from paperId to scored item for quick lookup
  const scoredMap = new Map(scored.map((s) => [s.candidate.id, s.candidate]))

  await Promise.allSettled(
    clusters.map(async (cluster) => {
      // Get 3 papers nearest to cluster centroid for labeling
      const clusterPapers = cluster.paperIds
        .map((id) => scoredMap.get(id))
        .filter(Boolean) as Array<{ id: string; title: string; abstract: string | null }>

      const sample = clusterPapers.slice(0, 3)
      if (sample.length === 0) {
        labels[cluster.clusterIndex] = `Topic ${cluster.clusterIndex + 1}`
        return
      }

      try {
        const label = await labelCluster(sample)
        labels[cluster.clusterIndex] = label
      } catch {
        labels[cluster.clusterIndex] = `Topic ${cluster.clusterIndex + 1}`
      }
    })
  )

  return labels
}

/**
 * Ensure a paper has plainSummary/technicalSummary cached.
 * Generates if missing, caches on CandidatePaper.
 */
async function ensurePaperSummaries(paper: {
  id: string
  title: string
  authors: string[]
  abstract: string | null
  candidateMetadata: unknown
  plainSummary: string | null
  technicalSummary: string | null
  noveltyTag: string | null
}): Promise<{ plainSummary: string; technicalSummary: string; noveltyTag: string }> {
  if (paper.plainSummary && paper.technicalSummary && paper.noveltyTag) {
    return {
      plainSummary: paper.plainSummary,
      technicalSummary: paper.technicalSummary,
      noveltyTag: paper.noveltyTag,
    }
  }

  const summaries = await generatePaperSummaries({
    title: paper.title,
    authors: paper.authors,
    abstract: paper.abstract,
    candidateMetadata: paper.candidateMetadata as PaperMetadata | null,
  })

  // Cache on CandidatePaper
  await prisma.candidatePaper.update({
    where: { id: paper.id },
    data: {
      plainSummary: summaries.plainSummary,
      technicalSummary: summaries.technicalSummary,
      noveltyTag: summaries.noveltyTag,
    },
  }).catch(() => {/* Non-fatal if caching fails */ })

  return summaries
}
