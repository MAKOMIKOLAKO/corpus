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
    notes?: string | null
    // 'identifiers-only' restricts dedup to explicit DOI/ISBN matches (no fuzzy
    // title/author/year or URL matching) and stores the new GlobalEntry without
    // the fuzzy keys, so a hand-typed entry can never merge into or be blocked
    // by an unrelated existing entry. Default: 'full'.
    dedupMode?: 'full' | 'identifiers-only'
  }
): Promise<SaveEntryResult> {

  const identifiersOnly = options?.dedupMode === 'identifiers-only'

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
  let globalEntryId = await findExistingGlobalEntry(prisma, keys, { identifiersOnly })
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
        // For manual entries, leave the unique fuzzy keys null so two hand-typed
        // works that happen to normalize alike don't collide on the unique index.
        canonicalUrl: identifiersOnly ? null : keys.canonicalUrl,
        contentHash: identifiersOnly ? null : keys.contentHash,
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
  } else if (identifiersOnly) {
    // Manual entry matched an existing record by explicit identifier (DOI/ISBN).
    // The hand-typed metadata is authoritative — repair the shared record rather
    // than letting the manual entry silently inherit stale or garbage data
    // (e.g. a "Client Challenge" / "Just a moment..." bot-block page that a
    // previous URL fetch scraped instead of the real article).
    await prisma.globalEntry.update({
      where: { id: globalEntryId },
      data: {
        title: input.title,
        authors: input.authors,
        year: input.year ?? null,
        abstract: input.abstract ?? undefined,
        source: input.source ?? undefined,
        url: input.url ?? undefined,
        rawContentType: input.rawContentType ?? undefined,
        // keep the non-unique fuzzy keys in sync; leave contentHash /
        // canonicalUrl untouched to avoid unique-index collisions
        normalizedTitle: keys.normalizedTitle,
        normalizedFirstAuthor: keys.normalizedFirstAuthor,
        publicationYear: keys.publicationYear,
      },
    })
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
      notes: options?.notes ?? null,
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

/**
 * Create or find a GlobalEntry without creating a UserEntry.
 * Used for RSS ingestion where entries should appear in the RSS feed
 * but not automatically added to the user's library.
 */
export async function createGlobalEntryOnly(
  input: GlobalEntryInput
): Promise<{ globalEntryId: string; wasNew: boolean }> {
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

  if (globalEntryId) {
    return { globalEntryId, wasNew: false }
  }

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
      addedVia: input.addedVia ?? 'manual',
      saveCount: 0,
    }
  })

  return { globalEntryId: globalEntry.id, wasNew: true }
}
