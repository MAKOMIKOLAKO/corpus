import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type PaperRow = {
  id: string
  embeddingText: string | null
}

type ClusterSeed = {
  clusterId: number
  members: string[]
  centroid: number[]
}

type DailySetIdRow = { id: string }

function todayUTC(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function isVector(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'number' && Number.isFinite(x))
}

function parseVectorText(value: string | null): number[] | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    console.log('[parseVectorText] Invalid format (no brackets):', trimmed.slice(0, 50))
    return null
  }
  const body = trimmed.slice(1, -1)
  if (!body) return null
  const parsed = body.split(',').map((x) => Number(x.trim()))
  if (parsed.some((n) => !Number.isFinite(n))) {
    console.log('[parseVectorText] Invalid number in vector')
    return null
  }
  return parsed
}

function deterministicShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296
    const j = s % (i + 1)
    const t = out[i]
    out[i] = out[j]
    out[j] = t
  }
  return out
}

function average(vectors: number[][]): number[] {
  if (vectors.length === 0) return []
  const dims = vectors[0].length
  const out = new Array(dims).fill(0)
  for (const v of vectors) {
    if (v.length !== dims) continue
    for (let i = 0; i < dims; i++) out[i] += v[i]
  }
  return out.map((x) => x / vectors.length)
}

function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 1
  let dot = 0
  let an = 0
  let bn = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    an += a[i] * a[i]
    bn += b[i] * b[i]
  }
  if (an <= 0 || bn <= 0) return 1
  return 1 - dot / (Math.sqrt(an) * Math.sqrt(bn))
}

function simpleDeterministicKMeans(rows: Array<{ id: string; embedding: number[] }>, k: number): ClusterSeed[] {
  const shuffled = deterministicShuffle(rows, 1337)
  const seeds = shuffled.slice(0, Math.min(k, shuffled.length)).map((r) => r.embedding)
  if (seeds.length === 0) return []

  let centroids = seeds.map((c) => [...c])

  for (let iter = 0; iter < 8; iter++) {
    const buckets: number[][][] = new Array(centroids.length).fill(null).map(() => [])
    for (const row of rows) {
      let best = 0
      let bestDist = Number.POSITIVE_INFINITY
      for (let i = 0; i < centroids.length; i++) {
        const d = cosineDistance(row.embedding, centroids[i])
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      }
      buckets[best].push(row.embedding)
    }

    centroids = centroids.map((c, i) => (buckets[i].length > 0 ? average(buckets[i]) : c))
  }

  const members = new Array(centroids.length).fill(null).map(() => [] as string[])
  for (const row of rows) {
    let best = 0
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = 0; i < centroids.length; i++) {
      const d = cosineDistance(row.embedding, centroids[i])
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    members[best].push(row.id)
  }

  return centroids.map((centroid, i) => ({ clusterId: i, members: members[i], centroid }))
}

function vectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`
}

export async function buildDailyResearchIndex(): Promise<{ date: string; candidateCount: number; clusterCount: number }> {
  const bucketDate = todayUTC()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const rawRows = await prisma.$queryRaw<PaperRow[]>(Prisma.sql`
    SELECT "id", "embedding"::text AS "embeddingText"
    FROM "CandidatePaper"
    WHERE "embedding" IS NOT NULL
      AND ("source" LIKE 'arXiv:%' OR "source" = 'bioRxiv' OR "source" = 'medRxiv')
    LIMIT 1000
  `)

  console.log('[dailyResearchIndex] Raw rows returned:', rawRows.length)
  if (rawRows.length > 0) {
    console.log('[dailyResearchIndex] Sample embeddingText:', rawRows[0].embeddingText?.slice(0, 100))
  }

  const rows = rawRows
    .map((r) => ({ id: r.id, embedding: parseVectorText(r.embeddingText) }))
    .filter((r): r is { id: string; embedding: number[] } => isVector(r.embedding))

  console.log('[dailyResearchIndex] Rows after parsing:', rows.length)

  await prisma.$executeRaw(Prisma.sql`DELETE FROM "DailyCandidateSetPaper"`)
  await prisma.$executeRaw(Prisma.sql`DELETE FROM "DailyCandidateSet" WHERE "date" = ${bucketDate}`)

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "DailyCandidateSet" ("id", "date", "createdAt")
    VALUES (gen_random_uuid()::text, ${bucketDate}, NOW())
  `)

  const dailySetRows = await prisma.$queryRaw<DailySetIdRow[]>(Prisma.sql`
    SELECT "id" FROM "DailyCandidateSet" WHERE "date" = ${bucketDate} LIMIT 1
  `)
  const dailySetId = dailySetRows[0]?.id

  if (dailySetId) {
    const batchSize = 100
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const values = batch.map((row) => `(gen_random_uuid()::text, ${Prisma.join([dailySetId, row.id])})`).join(', ')
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "DailyCandidateSetPaper" ("id", "dailyCandidateSetId", "candidatePaperId")
          VALUES ${Prisma.raw(values)}
          ON CONFLICT DO NOTHING
        `
      )
    }
  }

  return {
    date: bucketDate.toISOString().split('T')[0],
    candidateCount: rows.length,
    clusterCount: 0,
  }
}
