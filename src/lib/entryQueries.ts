import { PrismaClient, Prisma } from '@prisma/client'

/**
 * The standard select for UserEntry with its GlobalEntry.
 * Used everywhere a "library entry" needs to be returned to the client.
 * Returns a shape the frontend can consume as a unified entry object.
 */
export const userEntryWithGlobal = {
  id: true,
  userId: true,
  globalEntryId: true,
  readingStatus: true,
  addedVia: true,
  addedByQueryId: true,
  createdAt: true,
  updatedAt: true,
  lastViewedAt: true,
  globalEntry: {
    select: {
      id: true,
      title: true,
      authors: true,
      year: true,
      abstract: true,
      source: true,
      url: true,
      doi: true,
      isbn: true,
      canonicalUrl: true,
      metadata: true,
      saveCount: true,
      addedVia: true,
      createdAt: true,
    }
  },
  collections: {
    select: {
      collectionId: true,
      addedAt: true,
      collection: {
        select: { id: true, name: true }
      }
    }
  }
} satisfies Prisma.UserEntrySelect

/**
 * Transform a UserEntry + GlobalEntry DB result into the 
 * flat "entry" shape the frontend expects.
 * This is the single translation layer between DB and API response.
 */
export function flattenUserEntry(ue: any) {
  return {
    // UserEntry identity
    id: ue.id,                           // UserEntry.id is the primary identifier
    globalEntryId: ue.globalEntryId,
    userId: ue.userId,

    // GlobalEntry content fields (flat)
    title: ue.globalEntry.title,
    authors: ue.globalEntry.authors,
    year: ue.globalEntry.year,
    abstract: ue.globalEntry.abstract,
    source: ue.globalEntry.source,
    url: ue.globalEntry.url,
    doi: ue.globalEntry.doi,
    isbn: ue.globalEntry.isbn,
    metadata: ue.globalEntry.metadata,
    saveCount: ue.globalEntry.saveCount,

    // Per-user fields
    readingStatus: ue.readingStatus,
    addedVia: ue.addedVia,
    createdAt: ue.createdAt,
    updatedAt: ue.updatedAt,
    lastViewedAt: ue.lastViewedAt,

    // Collection membership
    collections: ue.collections?.map((c: any) => ({
      collectionId: c.collectionId,
      name: c.collection?.name,
      addedAt: c.addedAt
    })) ?? [],
  }
}

/**
 * Build a Prisma where clause for UserEntry search.
 * Searches across GlobalEntry fields via relation.
 */
export function buildSearchWhere(
  userId: string,
  params: {
    q?: string
    readingStatus?: string
    year?: number
    collectionId?: string
  }
): Prisma.UserEntryWhereInput {
  const where: Prisma.UserEntryWhereInput = {
    userId
  }

  if (params.readingStatus) {
    where.readingStatus = params.readingStatus as any
  }

  if (params.collectionId) {
    where.collections = {
      some: { collectionId: params.collectionId }
    }
  }

  if (params.q) {
    const q = params.q.trim()
    where.globalEntry = {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { abstract: { contains: q, mode: 'insensitive' } },
        { source: { contains: q, mode: 'insensitive' } },
        { authors: { hasSome: [q] } },
      ],
      ...(params.year && { year: params.year })
    }
  } else if (params.year) {
    where.globalEntry = { year: params.year }
  }

  return where
}
