/**
 * Pure scoring functions for the Research Feed ranking system.
 * All functions are stateless and return normalized [0, 1] scores.
 * No database calls — inputs are pre-fetched by the pipeline.
 */

import { cosineSimilarity } from './embeddings'

export interface SubScores {
  semantic: number
  domain: number
  novelty: number
  citation: number
  engagement: number
}

export interface CompositeWeights {
  semantic: number
  domain: number
  novelty: number
  citation: number
  engagement: number
}

export interface CandidatePaperForScoring {
  id: string
  embedding: number[] | null
  candidateMetadata: {
    domainTags?: string[]
    complexityScore?: number
    noveltyIndicators?: string[]
    methodology?: string
  } | null
  publishedDate: Date | null
  // From Semantic Scholar metadata if available
  citationCount?: number | null
}

export interface UserProfileForScoring {
  interestVector: number[] | null
  domainWeights: Record<string, number>
  // Up to 50 most recent GlobalEntry embeddings for novelty computation
  recentLibraryEmbeddings: number[][]
}

const DEFAULT_WEIGHTS: CompositeWeights = {
  semantic: 0.40,
  domain: 0.20,
  novelty: 0.20,
  citation: 0.10,
  engagement: 0.10,
}

/**
 * Semantic similarity score with non-linear transform (score^0.7)
 * to reduce dominance of very high similarity papers.
 */
export function computeSemanticScore(
  paperEmbedding: number[],
  interestVector: number[]
): number {
  const rawSim = cosineSimilarity(paperEmbedding, interestVector)
  // Clamp to [0, 1] (cosine can be negative)
  const clamped = Math.max(0, rawSim)
  // Non-linear transform to give moderate-similarity papers a fair chance
  return Math.pow(clamped, 0.7)
}

/**
 * Domain overlap score.
 * Sums matched weights from the user's domain weight map for this paper's tags.
 * Normalizes by dividing by the max possible score (sum of user's top-N weights
 * where N = number of paper's domain tags).
 */
export function computeDomainScore(
  domainTags: string[],
  domainWeights: Record<string, number>
): number {
  if (!domainTags || domainTags.length === 0) return 0
  if (!domainWeights || Object.keys(domainWeights).length === 0) return 0

  // Sum matched weights
  let matched = 0
  for (const tag of domainTags) {
    matched += domainWeights[tag] ?? 0
  }

  // Normalize: max possible = sum of top-N user weights where N = tag count
  const sortedWeights = Object.values(domainWeights).sort((a, b) => b - a)
  const topN = sortedWeights.slice(0, domainTags.length)
  const maxPossible = topN.reduce((a, b) => a + b, 0)

  if (maxPossible === 0) return 0
  return Math.min(1, matched / maxPossible)
}

/**
 * Novelty score: 60% recency + 40% library distance.
 * Recency: exponential decay, half-life of 3 days.
 * Library distance: 1 - max cosine similarity to user's recent library embeddings.
 */
export function computeNoveltyScore(
  paperEmbedding: number[],
  publishedDate: Date | null,
  recentLibraryEmbeddings: number[][]
): number {
  // Recency component
  let recencyComponent = 0.5 // neutral default
  if (publishedDate) {
    const daysSince = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24)
    recencyComponent = Math.exp((-daysSince * Math.LN2) / 3)
  }

  // Library distance: higher = more novel relative to user's collection
  let libraryDistanceComponent = 0.5 // neutral default
  if (recentLibraryEmbeddings.length > 0) {
    let maxSim = 0
    for (const libEmb of recentLibraryEmbeddings) {
      const sim = cosineSimilarity(paperEmbedding, libEmb)
      if (sim > maxSim) maxSim = sim
    }
    libraryDistanceComponent = Math.max(0, 1 - maxSim)
  }

  return 0.6 * recencyComponent + 0.4 * libraryDistanceComponent
}

/**
 * Citation velocity score.
 * Normalizes by the 95th percentile velocity in today's corpus.
 * If no citation data: returns 0.5 as a neutral default.
 */
export function computeCitationScore(
  citationCount: number | null | undefined,
  publishedDate: Date | null,
  p95Velocity: number
): number {
  if (!citationCount || !publishedDate) return 0.5

  const daysSince = Math.max(1, (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24))
  const velocity = citationCount / daysSince

  if (p95Velocity === 0) return 0.5
  return Math.min(1, velocity / p95Velocity)
}

/**
 * Engagement signal: fraction of similar-profile users who saved this paper.
 * If cohort < 5: returns 0 (weight redistributed to semantic in composite).
 */
export function computeEngagementScore(
  savedByInCohort: number,
  cohortSize: number
): number {
  if (cohortSize < 5) return 0
  return Math.min(1, savedByInCohort / cohortSize)
}

/**
 * Composite score. If engagement = 0 and cohort < 5, redistributes the
 * engagement weight (0.10) to semantic similarity.
 */
export function computeCompositeScore(
  subScores: SubScores,
  smallCohort: boolean = false
): number {
  const weights = smallCohort
    ? { ...DEFAULT_WEIGHTS, semantic: 0.50, engagement: 0.00 }
    : DEFAULT_WEIGHTS

  return (
    subScores.semantic * weights.semantic +
    subScores.domain * weights.domain +
    subScores.novelty * weights.novelty +
    subScores.citation * weights.citation +
    subScores.engagement * weights.engagement
  )
}

/**
 * Compute 95th percentile citation velocity across a corpus of papers.
 * Used to normalize citation scores.
 */
export function computeP95Velocity(
  papers: Array<{ citationCount?: number | null; publishedDate: Date | null }>
): number {
  const velocities: number[] = []
  for (const p of papers) {
    if (!p.citationCount || !p.publishedDate) continue
    const days = Math.max(1, (Date.now() - p.publishedDate.getTime()) / (1000 * 60 * 60 * 24))
    velocities.push(p.citationCount / days)
  }

  if (velocities.length === 0) return 0

  velocities.sort((a, b) => a - b)
  const idx = Math.floor(0.95 * velocities.length)
  return velocities[idx] ?? velocities[velocities.length - 1]
}
