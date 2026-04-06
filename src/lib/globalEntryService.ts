import prisma from './prisma' // use existing prisma client
import {
  getDeduplicationKeys,
  findExistingGlobalEntry,
} from './entryDedup'

export interface GlobalEntryInput {
  title: string
  authors: string[]
  year?: number | null
  abstract?: string | null
  source?: string | null
  url?: string | null
  doi?: string | null
  isbn?: string[] | null
  metadata?: Record<string, any> | null
  rawContentType?: string | null
  addedVia?: string
}

export interface SaveEntryResult {
  userEntryId: string
  globalEntryId: string
  wasGlobalNew: boolean      // true if GlobalEntry was just created
  wasUserEntryNew: boolean   // true if UserEntry was just created
  isDuplicate: boolean       // true if user already had this entry
}

/**
 * The core idempotent save operation.
 * 1. Find or create GlobalEntry using deduplication chain
 * 2. Find or create UserEntry for this user
 * 3. Returns result indicating what was created vs reused
 */
export async function saveEntryForUser(
  userId: string,
  input: GlobalEntryInput,
  options?: {
    readingStatus?: string
    addedVia?: string
    addedByQueryId?: string
    collectionId?: string
  }
): Promise<SaveEntryResult> {

  // Step 1: Compute deduplication keys
  const keys = getDeduplicationKeys({
    doi: input.doi,
    isbn: input.isbn?.[0] || null,
    title: input.title,
    authors: input.authors,
    year: input.year,
    url: input.url,
  })

  // Step 2: Find existing GlobalEntry or create new one
  let globalEntryId = await findExistingGlobalEntry(prisma, keys)
  let wasGlobalNew = false

  if (!globalEntryId) {
    // Create new GlobalEntry
    const globalEntry = await prisma.globalEntry.create({
      data: {
        doi: keys.doi,
        isbn: keys.isbn,
        normalizedTitle: keys.normalizedTitle,
        normalizedFirstAuthor: keys.normalizedFirstAuthor,
        publicationYear: keys.publicationYear,
        canonicalUrl: keys.canonicalUrl,
        contentHash: keys.contentHash,
        title: input.title,
        authors: input.authors,
        year: input.year,
        abstract: input.abstract,
        source: input.source,
        url: input.url,
        rawContentType: input.rawContentType,
        metadata: input.metadata || undefined,
        addedVia: options?.addedVia ?? 'manual',
        saveCount: 0,
      }
    })
    globalEntryId = globalEntry.id
    wasGlobalNew = true
  }

  // Step 3: Check if user already has this entry
  const existingUserEntry = await prisma.userEntry.findUnique({
    where: {
      userId_globalEntryId: { userId, globalEntryId }
    },
    select: { id: true }
  })

  if (existingUserEntry) {
    // User already has this entry — idempotent, return existing
    return {
      userEntryId: existingUserEntry.id,
      globalEntryId,
      wasGlobalNew,
      wasUserEntryNew: false,
      isDuplicate: true
    }
  }

  // Step 4: Create UserEntry
  const userEntry = await prisma.userEntry.create({
    data: {
      userId,
      globalEntryId,
      readingStatus: (options?.readingStatus as any) ?? 'UNREAD',
      addedVia: options?.addedVia ?? 'manual',
      addedByQueryId: options?.addedByQueryId ?? null,
    }
  })

  // Step 5: Increment saveCount on GlobalEntry
  await prisma.globalEntry.update({
    where: { id: globalEntryId },
    data: { saveCount: { increment: 1 } }
  })

  // Step 6: Update user's entriesCount denormalized field
  await prisma.user.update({
    where: { id: userId },
    data: { entriesCount: { increment: 1 } }
  })

  // Step 7: Link to collection if provided
  if (options?.collectionId) {
    await prisma.userEntryCollection.create({
      data: {
        userEntryId: userEntry.id,
        collectionId: options.collectionId,
      }
    }).catch(() => {
      // Ignore P2002 unique constraint — already in collection
    })
  }

  return {
    userEntryId: userEntry.id,
    globalEntryId,
    wasGlobalNew,
    wasUserEntryNew: true,
    isDuplicate: false
  }
}

/**
 * Remove a UserEntry for a user.
 * Decrements saveCount on GlobalEntry.
 * Does NOT delete the GlobalEntry — it may be used by other users.
 */
export async function removeEntryForUser(
  userId: string,
  userEntryId: string
): Promise<void> {
  const userEntry = await prisma.userEntry.findFirst({
    where: { id: userEntryId, userId },
    select: { id: true, globalEntryId: true }
  })

  if (!userEntry) {
    throw new Error('UserEntry not found or does not belong to user')
  }

  // Delete UserEntry (cascades to UserEntryCollection)
  await prisma.userEntry.delete({
    where: { id: userEntryId }
  })

  // Decrement saveCount (never below 0)
  await prisma.globalEntry.update({
    where: { id: userEntry.globalEntryId! },
    data: { saveCount: { decrement: 1 } }
  })

  // Update user's denormalized count
  await prisma.user.update({
    where: { id: userId },
    data: { entriesCount: { decrement: 1 } }
  })
}
