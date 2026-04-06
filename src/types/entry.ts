/**
 * The shape returned by flattenUserEntry — 
 * this is what every component receives
 */
export interface FlatEntry {
  // Identity
  id: string              // UserEntry.id — use this as the primary key everywhere
  globalEntryId: string   // GlobalEntry.id — use for dedup checks
  userId: string

  // Content (from GlobalEntry — shared, read-only)
  title: string
  authors: string[]
  year: number | null
  abstract: string | null
  source: string | null
  url: string | null
  doi: string | null
  isbn: string | null
  metadata: Record<string, any> | null
  saveCount: number       // how many Corpus users have saved this

  // Per-user state (from UserEntry — editable)
  readingStatus: 'UNREAD' | 'BACKLOG' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED'
  addedVia: string | null
  createdAt: string       // when THIS USER saved it
  updatedAt: string
  lastViewedAt: string | null

  // Collection membership
  collections: Array<{
    collectionId: string
    name: string
    addedAt: string
  }>

  // Duplicate detection (returned on POST when isDuplicate: true)
  isDuplicate?: boolean
  message?: string
}
