import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { embedBatch, buildPaperEmbeddingText } from './embeddings'
import { getOrCreateProfile, recomputeUserProfile } from './interestProfile'

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
  scoreBreakdown: {
    semantic: number
    domain: number
    novelty: number
    citation: number
    engagement: number
  }
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

export interface FeedOverrides {
  mode?: 'profile' | 'collection' | 'phrase'
  collectionId?: string
  phrase?: string
  skipSummarization?: boolean
}

type TopKRow = {
  id: string
  title: string
  authors: string[]
  publishedDate: Date | null
  source: string | null
  doi: string | null
  url: string | null
  plainSummary: string | null
  technicalSummary: string | null
  noveltyTag: string | null
  candidateMetadata: unknown
  clusterId: number | null
  distance: number
}

type CachedPaperRow = Omit<TopKRow, 'distance'>
type CandidateSetDateRow = { date: Date }

const TOP_K = 260

function todayUTC(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function vectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`
}

function clampTarget(preferred: number): number {
  return Math.max(8, Math.min(20, preferred || 12))
}

function isFiniteVector(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
}

async function getUserSavedDois(userId: string): Promise<Set<string>> {
  const entries = await prisma.userEntry.findMany({
    where: { userId },
    include: { globalEntry: { select: { doi: true } } },
  })
  return new Set(entries.map((e) => e.globalEntry.doi).filter(Boolean) as string[])
}

async function getUserSavedCandidateIds(_userId: string): Promise<Set<string>> {
  return new Set<string>()
}

async function resolveInterestVector(
  userId: string,
  overrides?: FeedOverrides
): Promise<{ mode: 'profile' | 'collection' | 'phrase'; vector: number[] | null; preferred: number; dismissed: Set<string> }> {
  const profile = (await getOrCreateProfile(userId)) as any
  const mode = (overrides?.mode || profile.feedSelectionMode || 'profile') as 'profile' | 'collection' | 'phrase'
  const preferred = profile.preferredDailyCount ?? 12

  if (mode === 'collection' && (overrides?.collectionId || profile.feedSelectionCollectionId)) {
    const collectionId = overrides?.collectionId || profile.feedSelectionCollectionId
    const rows = await prisma.userEntryCollection.findMany({
      where: { collectionId, userEntry: { userId } },
      include: { userEntry: { include: { globalEntry: { select: { title: true, abstract: true } } } } },
      take: 100,
    })
    const texts = rows
      .filter((r) => r.userEntry.globalEntry.abstract)
      .map((r) => buildPaperEmbeddingText(r.userEntry.globalEntry.title, r.userEntry.globalEntry.abstract))
    if (texts.length > 0) {
      const embeddings = await embedBatch(texts)
      if (embeddings.length > 0 && embeddings[0]) {
        const dims = embeddings[0].length
        const sum = new Array(dims).fill(0)
        let count = 0
        for (const e of embeddings) {
          if (!e || e.length !== dims) continue
          for (let i = 0; i < dims; i++) sum[i] += e[i]
          count++
        }
        if (count > 0) {
          return { mode, vector: sum.map((x) => x / count), preferred, dismissed: new Set(profile.dismissedPaperIds || []) }
        }
      }
    }
  }

  if (mode === 'phrase' && (overrides?.phrase || profile.feedSelectionPhrase)) {
    const phrase = overrides?.phrase || profile.feedSelectionPhrase
    const e = await embedBatch([buildPaperEmbeddingText(phrase, phrase)])
    return { mode, vector: e[0] ?? null, preferred, dismissed: new Set(profile.dismissedPaperIds || []) }
  }

  if (!profile.interestVector || !profile.lastRecomputedAt) {
    await recomputeUserProfile(userId)
    const refreshed = await getOrCreateProfile(userId)
    return {
      mode: 'profile',
      vector: isFiniteVector((refreshed as any).interestVector) ? ((refreshed as any).interestVector as number[]) : null,
      preferred,
      dismissed: new Set((refreshed as any).dismissedPaperIds || []),
    }
  }

  return {
    mode: 'profile',
    vector: isFiniteVector(profile.interestVector) ? (profile.interestVector as number[]) : null,
    preferred,
    dismissed: new Set(profile.dismissedPaperIds || []),
  }
}

function rerankScore(row: TopKRow): number {
  const similarity = 1 - Math.max(0, row.distance)
  const publishedTs = row.publishedDate ? new Date(row.publishedDate).getTime() : 0
  const recencyBoost = publishedTs > 0 ? Math.max(0, 1 - (Date.now() - publishedTs) / (1000 * 60 * 60 * 24 * 30)) * 0.08 : 0
  const meta = (row.candidateMetadata || {}) as { citationCount?: number }
  const citationBoost = Number.isFinite(meta.citationCount) ? Math.min(0.07, (meta.citationCount || 0) / 2000) : 0
  return similarity + recencyBoost + citationBoost
}

function selectDiverse(rows: TopKRow[], preferred: number): TopKRow[] {
  const target = clampTarget(preferred)
  const byCluster = new Map<number, TopKRow[]>()
  for (const row of rows) {
    const k = row.clusterId ?? 0
    const list = byCluster.get(k) || []
    list.push(row)
    byCluster.set(k, list)
  }

  Array.from(byCluster.values()).forEach((list: TopKRow[]) => {
    list.sort((a: TopKRow, b: TopKRow) => rerankScore(b) - rerankScore(a))
  })

  const clusterIds = Array.from(byCluster.keys()).sort((a, b) => a - b)
  const offsets = new Map<number, number>(clusterIds.map((id) => [id, 0]))
  const selected: TopKRow[] = []
  while (selected.length < target) {
    let progressed = false
    for (const cid of clusterIds) {
      if (selected.length >= target) break
      const list = byCluster.get(cid) || []
      const off = offsets.get(cid) || 0
      if (off < list.length) {
        selected.push(list[off])
        offsets.set(cid, off + 1)
        progressed = true
      }
    }
    if (!progressed) break
  }

  if (selected.length < 8) {
    const picked = new Set(selected.map((s) => s.id))
    const fallback = [...rows].sort((a, b) => rerankScore(b) - rerankScore(a))
    for (const row of fallback) {
      if (selected.length >= Math.min(8, rows.length)) break
      if (!picked.has(row.id)) selected.push(row)
    }
  }

  return selected.slice(0, 20)
}

export async function getDailyBriefCached(userId: string): Promise<DailyFeedResponse | null> {
  const today = todayUTC()
  const brief = await prisma.dailyBrief.findUnique({ where: { userId_date: { userId, date: today } } })
  if (!brief) return null

  const ids = brief.selectedPaperIds || []
  if (ids.length === 0) {
    return {
      date: today.toISOString().split('T')[0],
      userId,
      preferredCount: 12,
      actualCount: 0,
      emergingTrends: brief.emergingTrendsParagraph,
      papers: [],
      clusters: [],
      generatedAt: brief.generatedAt.toISOString(),
      fromCache: true,
    }
  }

  const rows = await prisma.$queryRaw<CachedPaperRow[]>(Prisma.sql`
    SELECT
      cp."id", cp."title", cp."authors", cp."publishedDate", cp."source", cp."doi", cp."url",
      cp."plainSummary", cp."technicalSummary", cp."noveltyTag", cp."candidateMetadata", cp."clusterId"
    FROM "CandidatePaper" cp
    WHERE cp."id" = ANY(${ids}::text[])
  `)

  const rowMap = new Map(rows.map((r) => [r.id, r]))
  const savedDois = await getUserSavedDois(userId)
  const savedIds = await getUserSavedCandidateIds(userId)
  const why = (brief.whyExplanations as Record<string, string>) || {}

  const papers: PaperSummaryObject[] = ids
    .map((id) => rowMap.get(id))
    .filter((r): r is CachedPaperRow => !!r)
    .map((r) => {
      const meta = (r.candidateMetadata || {}) as { openAccessUrl?: string }
      const clusterLabel = `Topic ${(r.clusterId ?? 0) + 1}`
      return {
        candidatePaperId: r.id,
        globalEntryId: null,
        title: r.title,
        authors: r.authors,
        year: r.publishedDate?.getFullYear() ?? null,
        publishedDate: r.publishedDate?.toISOString() ?? null,
        source: r.source,
        doi: r.doi,
        url: r.url,
        plainSummary: r.plainSummary ?? '',
        technicalSummary: r.technicalSummary ?? '',
        whyExplanation: why[r.id] ?? '',
        noveltyTag: r.noveltyTag ?? 'New method',
        compositeScore: 0,
        scoreBreakdown: { semantic: 0, domain: 0, novelty: 0, citation: 0, engagement: 0 },
        clusterLabel,
        alreadySaved: savedDois.has(r.doi ?? '') || savedIds.has(r.id),
        openAccessUrl: meta.openAccessUrl ?? null,
      }
    })

  const byCluster = new Map<number, string[]>()
  for (const p of papers) {
    const clusterIndex = Number(p.clusterLabel.replace('Topic ', '')) - 1 || 0
    const list = byCluster.get(clusterIndex) || []
    list.push(p.candidatePaperId)
    byCluster.set(clusterIndex, list)
  }

  const clusters: ClusterObject[] = Array.from(byCluster.entries()).map(([clusterIndex, idsInCluster]) => ({
    clusterIndex,
    label: `Topic ${clusterIndex + 1}`,
    paperCount: idsInCluster.length,
    representativePaperIds: idsInCluster.slice(0, 3),
  }))

  return {
    date: today.toISOString().split('T')[0],
    userId,
    preferredCount: 12,
    actualCount: papers.length,
    emergingTrends: brief.emergingTrendsParagraph,
    papers,
    clusters,
    generatedAt: brief.generatedAt.toISOString(),
    fromCache: true,
  }
}

export async function generateDailyBrief(userId: string, overrides?: FeedOverrides): Promise<DailyFeedResponse> {
  const today = todayUTC()
  const resolved = await resolveInterestVector(userId, overrides)

  if (!resolved.vector || resolved.vector.length === 0) {
    return {
      date: today.toISOString().split('T')[0],
      userId,
      preferredCount: clampTarget(resolved.preferred),
      actualCount: 0,
      emergingTrends: null,
      papers: [],
      clusters: [],
      generatedAt: new Date().toISOString(),
      fromCache: false,
    }
  }

  const savedDois = await getUserSavedDois(userId)
  const savedIds = await getUserSavedCandidateIds(userId)
  const vector = vectorLiteral(resolved.vector)

  const candidateSetDateRows = await prisma.$queryRaw<CandidateSetDateRow[]>(Prisma.sql`
    SELECT "date"
    FROM "DailyCandidateSet"
    WHERE "date" <= ${today}
    ORDER BY "date" DESC
    LIMIT 1
  `)
  const fallbackCandidateSetDateRows = await prisma.$queryRaw<CandidateSetDateRow[]>(Prisma.sql`
    SELECT "date"
    FROM "DailyCandidateSet"
    ORDER BY "date" DESC
    LIMIT 1
  `)
  const candidateSetDate = candidateSetDateRows[0]?.date ?? fallbackCandidateSetDateRows[0]?.date ?? today

  const topK = await prisma.$queryRaw<TopKRow[]>(Prisma.sql`
    SELECT
      cp."id", cp."title", cp."authors", cp."publishedDate", cp."source", cp."doi", cp."url",
      cp."plainSummary", cp."technicalSummary", cp."noveltyTag", cp."candidateMetadata", cp."clusterId",
      (cp."embedding" <=> ${vector}::vector) AS distance
    FROM "CandidatePaper" cp
    INNER JOIN "DailyCandidateSetPaper" dcsp ON dcsp."candidatePaperId" = cp."id"
    INNER JOIN "DailyCandidateSet" dcs ON dcs."id" = dcsp."dailyCandidateSetId"
    WHERE dcs."date" = ${candidateSetDate}
      AND cp."embedding" IS NOT NULL
    ORDER BY cp."embedding" <=> ${vector}::vector ASC
    LIMIT ${TOP_K}
  `)

  const filtered = topK.filter((r) => {
    if (resolved.dismissed.has(r.id)) return false
    if (savedDois.has(r.doi ?? '')) return false
    if (savedIds.has(r.id)) return false
    return true
  })

  const selected = selectDiverse(filtered, resolved.preferred)
  const whyExplanations: Record<string, string> = {}

  const papers: PaperSummaryObject[] = selected.map((r) => {
    const meta = (r.candidateMetadata || {}) as { openAccessUrl?: string }
    const clusterId = r.clusterId ?? 0
    const why = `Matched your ${resolved.mode} interests and selected for topic diversity in today's index.`
    whyExplanations[r.id] = why
    return {
      candidatePaperId: r.id,
      globalEntryId: null,
      title: r.title,
      authors: r.authors,
      year: r.publishedDate?.getFullYear() ?? null,
      publishedDate: r.publishedDate?.toISOString() ?? null,
      source: r.source,
      doi: r.doi,
      url: r.url,
      plainSummary: r.plainSummary ?? '',
      technicalSummary: r.technicalSummary ?? '',
      whyExplanation: why,
      noveltyTag: r.noveltyTag ?? 'New method',
      compositeScore: Math.max(0, 1 - Math.max(0, r.distance)),
      scoreBreakdown: {
        semantic: Math.max(0, 1 - Math.max(0, r.distance)),
        domain: 0,
        novelty: 0,
        citation: 0,
        engagement: 0,
      },
      clusterLabel: `Topic ${clusterId + 1}`,
      alreadySaved: false,
      openAccessUrl: meta.openAccessUrl ?? null,
    }
  })

  const byCluster = new Map<number, string[]>()
  for (const p of papers) {
    const idx = Number(p.clusterLabel.replace('Topic ', '')) - 1 || 0
    const list = byCluster.get(idx) || []
    list.push(p.candidatePaperId)
    byCluster.set(idx, list)
  }

  const clusters: ClusterObject[] = Array.from(byCluster.entries()).map(([clusterIndex, ids]) => ({
    clusterIndex,
    label: `Topic ${clusterIndex + 1}`,
    paperCount: ids.length,
    representativePaperIds: ids.slice(0, 3),
  }))

  const brief = await prisma.dailyBrief.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      selectedPaperIds: papers.map((p) => p.candidatePaperId),
      whyExplanations: whyExplanations as unknown as Prisma.InputJsonValue,
      emergingTrendsParagraph: null,
      generatedAt: new Date(),
    },
    update: {
      selectedPaperIds: papers.map((p) => p.candidatePaperId),
      whyExplanations: whyExplanations as unknown as Prisma.InputJsonValue,
      emergingTrendsParagraph: null,
      generatedAt: new Date(),
    },
  })

  return {
    date: today.toISOString().split('T')[0],
    userId,
    preferredCount: clampTarget(resolved.preferred),
    actualCount: papers.length,
    emergingTrends: null,
    papers,
    clusters,
    generatedAt: brief.generatedAt.toISOString(),
    fromCache: false,
  }
}
