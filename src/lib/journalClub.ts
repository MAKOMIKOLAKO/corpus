// AUDIT: 2026-03-28
// Found: getNextMeetingDates monthly used setMonth (skipped days e.g. Jan 31); canManageJournalClub lacked owner note in comment
// Fixed: Monthly uses UTC year/month clamp; documented owner must pass ADMIN for canManageJournalClub

import { Plan, CollectionMember } from '@prisma/client'

// Collection interface with metadata support
export interface CollectionWithMetadata {
  id: string
  name: string
  description: string | null
  userId: string | null
  createdAt: Date
  isPublic: boolean
  publicSlug: string | null
  publicDescription: string | null
  publicViewCount: number
  isShared: boolean
  metadata: Record<string, unknown> | null
}

export type JournalClubMetadata = {
  isJournalClub: true
  meetingFrequency: 'weekly' | 'biweekly' | 'monthly'
  nextMeetingDate: string | null
  meetingDayOfWeek?: number // 0-6, Sunday=0
  votingEnabled?: boolean // Admin toggle for voting
}

export type JournalClubEntryMetadata = {
  presentationDate?: string // Date string "YYYY-MM-DD"
  presenterId?: string // userId
  presented?: boolean
  presenterName?: string // denormalized for display without extra query
}

// Check if a collection is a journal club
export function isJournalClub(collection: CollectionWithMetadata): boolean {
  try {
    const meta = collection.metadata
    if (!meta || typeof meta !== 'object') return false
    return (meta as any).isJournalClub === true
  } catch {
    return false
  }
}

/**
 * Schedule/manage journal club (create meetings, schedule papers, settings).
 * Requires Pro (or lifetime Pro) AND ADMIN role in the collection.
 * Callers must pass role `'ADMIN'` when the user is the collection owner
 * (owners may have no CollectionMember row).
 */
export function canManageJournalClub(
  userPlan: Plan,
  userRole: 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER'
): boolean {
  return (
    (userPlan === 'PRO' || userPlan === 'LIFETIME_PRO') &&
    userRole === 'ADMIN'
  )
}

// Check if user can participate (vote, comment, mark attendance)
// All members can participate regardless of plan
export function canParticipate(
  userRole: 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER' | null
): boolean {
  return userRole !== null
}

/**
 * Generate next meeting dates. Uses UTC calendar math for monthly so
 * e.g. Jan 31 + 1 month becomes Feb 28/29, not March 2–3.
 */
export function getNextMeetingDates(
  startDate: Date,
  frequency: 'weekly' | 'biweekly' | 'monthly',
  count: number
): Date[] {
  const dates: Date[] = []
  let y = startDate.getUTCFullYear()
  let m = startDate.getUTCMonth()
  let d = startDate.getUTCDate()

  for (let i = 0; i < count; i++) {
    dates.push(new Date(Date.UTC(y, m, d)))

    if (frequency === 'weekly') {
      const t = Date.UTC(y, m, d)
      const n = new Date(t + 7 * 24 * 60 * 60 * 1000)
      y = n.getUTCFullYear()
      m = n.getUTCMonth()
      d = n.getUTCDate()
    } else if (frequency === 'biweekly') {
      const t = Date.UTC(y, m, d)
      const n = new Date(t + 14 * 24 * 60 * 60 * 1000)
      y = n.getUTCFullYear()
      m = n.getUTCMonth()
      d = n.getUTCDate()
    } else {
      m += 1
      const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
      if (d > dim) d = dim
    }
  }
  return dates
}

// Format date for display in UI
export function formatJournalClubDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

// Get user's role in a collection from membership data
export function getUserCollectionRole(
  memberships: CollectionMember[],
  userId: string,
  collectionId: string
): 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER' | null {
  const membership = memberships.find(
    (m) =>
      m.userId === userId &&
      m.collectionId === collectionId &&
      m.status === 'ACCEPTED'
  )
  return membership?.role || null
}
