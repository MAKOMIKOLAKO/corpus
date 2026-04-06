import crypto from 'crypto'

/**
 * Normalize a title for deduplication comparison.
 * Removes punctuation, lowercases, collapses whitespace.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500) // cap length for DB storage
}

/**
 * Normalize an author name for deduplication comparison.
 * Extracts last name only for robustness.
 */
export function normalizeFirstAuthor(authors: string[]): string | null {
  if (!authors || authors.length === 0) return null
  const first = authors[0]
  if (!first) return null
  // Extract last name: "John Smith" → "smith", "Smith, J" → "smith"
  const parts = first.split(/[,\s]+/).filter(Boolean)
  return parts[parts.length - 1]?.toLowerCase().replace(/[^\w]/g, '') ?? null
}

/**
 * Normalize a URL for deduplication.
 * Removes tracking params, trailing slashes, normalizes protocol.
 */
export function normalizeUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'source', 'via', 'fbclid', 'gclid', 'mc_cid', 'mc_eid',
      'si', 'feature'
    ]
    trackingParams.forEach(p => u.searchParams.delete(p))
    // Normalize: lowercase hostname, remove trailing slash from path
    const normalized = `${u.protocol}//${u.hostname.toLowerCase()}${
      u.pathname.replace(/\/$/, '') || '/'
    }${u.search}`
    return normalized
  } catch {
    return null
  }
}

/**
 * Normalize a DOI string.
 * Strips prefixes and lowercases.
 */
export function normalizeDoi(doi: string): string {
  return doi
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .trim()
    .toLowerCase()
}

/**
 * Generate a content hash for a GlobalEntry.
 * Priority: DOI > ISBN > (normalizedTitle + normalizedFirstAuthor + year) > canonicalUrl
 */
export function generateContentHash(params: {
  doi?: string | null
  isbn?: string | null
  normalizedTitle?: string | null
  normalizedFirstAuthor?: string | null
  publicationYear?: number | null
  canonicalUrl?: string | null
}): string | null {
  let key: string | null = null

  if (params.doi) {
    key = `doi:${normalizeDoi(params.doi)}` 
  } else if (params.isbn) {
    key = `isbn:${params.isbn.replace(/[-\s]/g, '')}` 
  } else if (params.normalizedTitle && params.normalizedFirstAuthor) {
    key = `title:${params.normalizedTitle}|author:${params.normalizedFirstAuthor}|year:${params.publicationYear ?? 'unknown'}` 
  } else if (params.canonicalUrl) {
    key = `url:${params.canonicalUrl}` 
  }

  if (!key) return null
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Find deduplication lookup keys for an existing Entry record.
 * Returns the keys in priority order.
 */
export function getDeduplicationKeys(entry: {
  doi?: string | null
  isbn?: string | null
  title: string
  authors: string[]
  year?: number | null
  url?: string | null
}): {
  doi: string | null
  isbn: string | null
  normalizedTitle: string | null
  normalizedFirstAuthor: string | null
  publicationYear: number | null
  canonicalUrl: string | null
  contentHash: string | null
} {
  const doi = entry.doi ? normalizeDoi(entry.doi) : null
  const isbn = entry.isbn 
    ? entry.isbn.replace(/[-\s]/g, '') 
    : null
  const normalizedTitle = entry.title ? normalizeTitle(entry.title) : null
  const normalizedFirstAuthor = normalizeFirstAuthor(entry.authors)
  const publicationYear = entry.year ?? null
  const canonicalUrl = entry.url ? normalizeUrl(entry.url) : null
  const contentHash = generateContentHash({
    doi,
    isbn,
    normalizedTitle,
    normalizedFirstAuthor,
    publicationYear,
    canonicalUrl
  })

  return {
    doi,
    isbn,
    normalizedTitle,
    normalizedFirstAuthor,
    publicationYear,
    canonicalUrl,
    contentHash
  }
}

/**
 * Find an existing GlobalEntry using the deduplication priority chain.
 * Returns the GlobalEntry id if found, null if not found.
 */
export async function findExistingGlobalEntry(
  prisma: any,
  keys: ReturnType<typeof getDeduplicationKeys>
): Promise<string | null> {
  // Priority 1: DOI
  if (keys.doi) {
    const found = await prisma.globalEntry.findUnique({
      where: { doi: keys.doi },
      select: { id: true }
    })
    if (found) return found.id
  }

  // Priority 2: ISBN
  if (keys.isbn) {
    const found = await prisma.globalEntry.findUnique({
      where: { isbn: keys.isbn },
      select: { id: true }
    })
    if (found) return found.id
  }

  // Priority 3: Content hash (covers title+author+year and canonical URL)
  if (keys.contentHash) {
    const found = await prisma.globalEntry.findUnique({
      where: { contentHash: keys.contentHash },
      select: { id: true }
    })
    if (found) return found.id
  }

  // Priority 4: Canonical URL directly
  if (keys.canonicalUrl) {
    const found = await prisma.globalEntry.findUnique({
      where: { canonicalUrl: keys.canonicalUrl },
      select: { id: true }
    })
    if (found) return found.id
  }

  return null
}
