// AUDIT: 2026-03-28
// Found: (new file) centralize owner vs membership and acting user plan
// Fixed: getJournalClubAccess, getManageRole, getAcceptedMemberAndOwnerUserIds

import type { CollectionMember, Plan } from '@prisma/client'
import { prisma } from '@/lib/prismaWithRetry'

export type JournalClubAccess = {
  collection: {
    id: string
    userId: string | null
    metadata: unknown
    name: string
  }
  isOwner: boolean
  membership: CollectionMember | null
  /** Accepted member or collection owner */
  isMember: boolean
  actingUserPlan: Plan
}

/**
 * Loads collection, membership, and the authenticated user's plan (not the owner's plan).
 */
export async function getJournalClubAccess(
  collectionId: string,
  userId: string
): Promise<JournalClubAccess | null> {
  const [collection, actingUser] = await Promise.all([
    prisma.collection.findUnique({
      where: { id: collectionId },
      select: { id: true, userId: true, metadata: true, name: true }
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true }
    })
  ])

  if (!collection) return null

  const membership = await prisma.collectionMember.findUnique({
    where: {
      collectionId_userId: {
        collectionId,
        userId
      }
    }
  })

  const isOwner = collection.userId === userId
  const isMember = isOwner || membership?.status === 'ACCEPTED'

  return {
    collection,
    isOwner,
    membership,
    isMember,
    actingUserPlan: actingUser?.plan ?? 'FREE'
  }
}

/** Role to pass to canManageJournalClub: owners are treated as ADMIN. */
export function getManageRole(
  isOwner: boolean,
  membership: CollectionMember | null
): 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER' {
  if (isOwner) return 'ADMIN'
  return membership?.role ?? 'VIEWER'
}

/** Accepted members plus collection owner (deduped). Used for attendance seeding. */
export async function getAcceptedMemberAndOwnerUserIds(
  collectionId: string
): Promise<string[]> {
  const [members, coll] = await Promise.all([
    prisma.collectionMember.findMany({
      where: { collectionId, status: 'ACCEPTED' },
      select: { userId: true }
    }),
    prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true }
    })
  ])
  const ids = members.map((m) => m.userId)
  if (coll?.userId) ids.push(coll.userId)
  return Array.from(new Set(ids))
}
