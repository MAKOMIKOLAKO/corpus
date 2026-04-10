/**
 * UserResearchProfile computation.
 * Computes and persists the user's interest vector and domain weights
 * from their saved GlobalEntries.
 */

import prisma from '@/lib/prisma'
import { embedBatch, buildPaperEmbeddingText, computeCentroid } from './embeddings'

export interface UserProfileSummary {
  interestVector: number[] | null
  domainWeights: Record<string, number>
  topDomains: string[]
  recentPaperTitles: string[]
}

/**
 * Check if a user's profile needs to be recomputed.
 * Recompute if: never computed, or older than 7 days.
 * (New-entry-triggered recompute is handled by the save API route.)
 */
export function shouldRecompute(lastRecomputedAt: Date | null): boolean {
  if (!lastRecomputedAt) return true
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return lastRecomputedAt < sevenDaysAgo
}

/**
 * Get or create a UserResearchProfile for a user.
 */
export async function getOrCreateProfile(userId: string) {
  const existing = await prisma.userResearchProfile.findUnique({
    where: { userId },
  })
  if (existing) return existing

  return prisma.userResearchProfile.create({
    data: { userId, dismissedPaperIds: [], preferredDailyCount: 5 },
  })
}

/**
 * Recompute the user's interest profile from their saved GlobalEntries.
 *
 * Strategy:
 * - Fetch up to 200 most recently saved GlobalEntries (all with abstracttext)
 * - Papers saved in last 30 days are weighted 3x; older saves 1x
 * - Papers the user has opened in a reading session are weighted 2x
 * - Embed each entry's title+abstract with Gemini
 * - Compute weighted centroid as the interest vector
 * - Build domainWeights from candidateMetadata of CandidatePapers that
 *   match any of the user's saved entries by DOI or title
 */
export async function recomputeUserProfile(userId: string): Promise<void> {
  console.log(`[interestProfile] Recomputing profile for user ${userId}`)

  // Get user's saved GlobalEntries (most recent 200)
  const userEntries = await prisma.userEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      globalEntry: {
        select: {
          id: true,
          title: true,
          abstract: true,
          doi: true,
        },
      },
    },
  })

  if (userEntries.length === 0) {
    // No entries yet — create/update profile with empty state
    await prisma.userResearchProfile.upsert({
      where: { userId },
      create: {
        userId,
        interestVector: null,
        domainWeights: {},
        dismissedPaperIds: [],
        preferredDailyCount: 5,
        lastRecomputedAt: new Date(),
      },
      update: {
        interestVector: null,
        domainWeights: {},
        lastRecomputedAt: new Date(),
      },
    })
    return
  }

  // Check which entries the user has opened in a reading session (2x weight)
  const sessionGlobalIds = new Set<string>()
  const sessions = await prisma.paperReadingSession.findMany({
    where: { userId },
    select: { globalEntryId: true, candidatePaperId: true },
  })
  for (const s of sessions) {
    if (s.globalEntryId) sessionGlobalIds.add(s.globalEntryId)
  }


  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Build weighted text list for embedding
  const textsAndWeights: Array<{ text: string; weight: number; entryId: string }> = []

  for (const ue of userEntries) {
    const ge = ue.globalEntry
    if (!ge.title) continue

    const text = buildPaperEmbeddingText(ge.title, ge.abstract)
    let weight = 1

    // 3x for recent saves
    if (ue.createdAt >= thirtyDaysAgo) weight *= 3

    // 2x for deep engagement (has reading session)
    if (sessionGlobalIds.has(ge.id)) weight *= 2

    textsAndWeights.push({ text, weight, entryId: ge.id })
  }

  // Deduplicate texts to avoid redundant API calls
  const textSet: string[] = []
  const textSetLookup = new Set<string>()
  for (const t of textsAndWeights) {
    if (!textSetLookup.has(t.text)) {
      textSetLookup.add(t.text)
      textSet.push(t.text)
    }
  }
  const uniqueTexts = textSet

  let embeddings: number[][]
  try {
    embeddings = await embedBatch(uniqueTexts)
  } catch (err) {
    console.error('[interestProfile] Embedding failed:', err)
    // Still update lastRecomputedAt to avoid constant retries
    await prisma.userResearchProfile.upsert({
      where: { userId },
      create: { userId, dismissedPaperIds: [], preferredDailyCount: 5, lastRecomputedAt: new Date() },
      update: { lastRecomputedAt: new Date() },
    })
    return
  }

  const textToEmbedding = new Map<string, number[]>()
  for (let i = 0; i < uniqueTexts.length; i++) {
    textToEmbedding.set(uniqueTexts[i], embeddings[i])
  }

  // Build weighted embedding list
  const weightedEmbeddings: number[][] = []
  for (const item of textsAndWeights) {
    const emb = textToEmbedding.get(item.text)
    if (!emb) continue
    // Repeat-weighted: add the embedding `weight` times
    const repeats = Math.round(item.weight)
    for (let r = 0; r < repeats; r++) {
      weightedEmbeddings.push(emb)
    }
  }

  const interestVector = computeCentroid(weightedEmbeddings)

  // Build domainWeights from CandidatePaper records that match user's saved entries
  // Match by DOI from GlobalEntry
  const dois = userEntries
    .map((ue) => ue.globalEntry.doi)
    .filter(Boolean) as string[]

  const domainWeights: Record<string, number> = {}

  if (dois.length > 0) {
    const matchingCandidates = await prisma.candidatePaper.findMany({
      where: { doi: { in: dois } },
      select: { candidateMetadata: true },
    })

    for (const cp of matchingCandidates) {
      const meta = cp.candidateMetadata as { domainTags?: string[] } | null
      if (!meta?.domainTags) continue
      for (const tag of meta.domainTags) {
        domainWeights[tag] = (domainWeights[tag] ?? 0) + 1
      }
    }

    // Normalize domain weights to sum to 1
    const total = Object.values(domainWeights).reduce((a, b) => a + b, 0)
    if (total > 0) {
      for (const key of Object.keys(domainWeights)) {
        domainWeights[key] = domainWeights[key] / total
      }
    }
  }

  // Update profile
  await prisma.userResearchProfile.upsert({
    where: { userId },
    create: {
      userId,
      interestVector: interestVector.length > 0 ? interestVector : null,
      domainWeights,
      dismissedPaperIds: [],
      preferredDailyCount: 5,
      lastRecomputedAt: new Date(),
    },
    update: {
      interestVector: interestVector.length > 0 ? interestVector : null,
      domainWeights,
      lastRecomputedAt: new Date(),
    },
  })

  console.log(`[interestProfile] Profile updated for user ${userId}: ${weightedEmbeddings.length} weighted entries, ${Object.keys(domainWeights).length} domains`)
}

/**
 * Get a summary of the user's profile for prompt construction.
 */
export function buildUserContext(
  domainWeights: Record<string, number>,
  recentEntryTitles: string[]
): { topDomains: string[]; recentPaperTitles: string[] } {
  const topDomains = Object.entries(domainWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain]) => domain)

  return {
    topDomains,
    recentPaperTitles: recentEntryTitles.slice(0, 5),
  }
}
