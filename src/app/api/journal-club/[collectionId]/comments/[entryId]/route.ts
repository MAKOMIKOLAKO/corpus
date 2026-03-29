// AUDIT: 2026-03-28
// Found: No owner bypass; 403 for non-member
// Fixed: getJournalClubAccess; canParticipate; 404 policy

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'
import { canParticipate } from '@/lib/journalClub'
import { getJournalClubAccess, getManageRole } from '@/lib/journalClubAccess'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

export async function GET(
  request: NextRequest,
  { params }: { params: { collectionId: string; entryId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { collectionId, entryId } = params
    if (!collectionId?.trim() || !entryId?.trim()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const access = await getJournalClubAccess(collectionId, userId)
    if (!access || !access.isMember) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const role = getManageRole(access.isOwner, access.membership)
    if (!canParticipate(access.isOwner ? 'ADMIN' : role)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const entryCollection = await prisma.entryCollection.findUnique({
      where: {
        entryId_collectionId: {
          entryId,
          collectionId
        }
      }
    })

    if (!entryCollection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const comments = await prisma.entryComment.findMany({
      where: {
        entryId,
        collectionId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('[journal-club/comments GET]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
