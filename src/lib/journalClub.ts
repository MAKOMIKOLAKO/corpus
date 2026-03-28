import { Collection, Plan, CollectionMember } from '@prisma/client'

export type JournalClubMetadata = {
  isJournalClub: true
  meetingFrequency: 'weekly' | 'biweekly' | 'monthly'
  nextMeetingDate: string // Date string "YYYY-MM-DD"
  meetingDayOfWeek?: number // 0-6, Sunday=0
}

export type JournalClubEntryMetadata = {
  presentationDate?: string // Date string "YYYY-MM-DD"
  presenterId?: string // userId
  presented?: boolean
  presenterName?: string // denormalized for display without extra query
}

// Check if a collection is a journal club
export function isJournalClub(collection: Collection): boolean {
  const meta = collection.metadata as any
  return meta?.isJournalClub === true
}

// Check if user can manage a journal club (create, schedule, assign)
// Requires Pro plan AND ADMIN role in the collection
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

// Generate next meeting dates based on frequency
export function getNextMeetingDates(
  startDate: Date,
  frequency: 'weekly' | 'biweekly' | 'monthly',
  count: number
): Date[] {
  const dates: Date[] = []
  let current = new Date(startDate)
  for (let i = 0; i < count; i++) {
    dates.push(new Date(current))
    if (frequency === 'weekly') {
      current.setDate(current.getDate() + 7)
    } else if (frequency === 'biweekly') {
      current.setDate(current.getDate() + 14)
    } else {
      current.setMonth(current.getMonth() + 1)
    }
  }
  return dates
}

// Format date for display in UI
export function formatJournalClubDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  // Output: "Monday, March 30, 2026"
}

// Get user's role in a collection from membership data
export function getUserCollectionRole(
  memberships: CollectionMember[],
  userId: string,
  collectionId: string
): 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER' | null {
  const membership = memberships.find(
    m => m.userId === userId && m.collectionId === collectionId && m.status === 'ACCEPTED'
  )
  return membership?.role || null
}
