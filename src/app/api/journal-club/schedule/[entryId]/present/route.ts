// AUDIT: 2026-03-28
// Found: Owner without membership blocked; wrong plan for canManage; meeting date TZ; attendance missing owner; awaited signals
// Fixed: isOwner + presenter OR canManage; actingUserPlan; UTC date string; upsert meeting + createMany attendance; fire-and-forget signal

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'
import { canManageJournalClub, isJournalClub } from '@/lib/journalClub'
import {
  getAcceptedMemberAndOwnerUserIds,
  getJournalClubAccess,
  getManageRole
} from '@/lib/journalClubAccess'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

export async function PATCH(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entryId } = params
    if (!entryId?.trim()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const collectionId =
      typeof body.collectionId === 'string' ? body.collectionId.trim() : ''

    if (!collectionId) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 })
    }

    const access = await getJournalClubAccess(collectionId, userId)
    if (!access || !access.isMember) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId }
    })
    if (!collection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!isJournalClub(collection)) {
      return NextResponse.json(
        { error: 'This collection is not a journal club' },
        { status: 400 }
      )
    }

    const { isOwner, membership, actingUserPlan } = access
    const manageRole = getManageRole(isOwner, membership)

    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { metadata: true, title: true }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const entryMeta = entry.metadata as Record<string, unknown> | null
    const isPresenter = entryMeta?.presenterId === userId
    const canManage = canManageJournalClub(actingUserPlan, manageRole)
    if (!canManage && !isPresenter) {
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
      return NextResponse.json(
        { error: 'This paper is not in this collection' },
        { status: 404 }
      )
    }

    if (!entryMeta?.presentationDate) {
      return NextResponse.json(
        { error: 'Entry is not scheduled for presentation' },
        { status: 400 }
      )
    }

    const dateStr = String(entryMeta.presentationDate)
    const meetingDate = new Date(dateStr + 'T00:00:00.000Z')

    const updatedEntry = await prisma.entry.update({
      where: { id: entryId },
      data: {
        metadata: {
          ...(entryMeta || {}),
          presented: true
        }
      }
    })

    const meeting = await prisma.journalClubMeeting.upsert({
      where: {
        collectionId_date: {
          collectionId,
          date: meetingDate
        }
      },
      update: {},
      create: {
        collectionId,
        date: meetingDate
      }
    })

    const userIds = await getAcceptedMemberAndOwnerUserIds(collectionId)
    await prisma.attendance.createMany({
      data: userIds.map((uid) => ({
        meetingId: meeting.id,
        userId: uid,
        status: 'ABSENT' as const
      })),
      skipDuplicates: true
    })

    prisma.signal
      .create({
        data: {
          userId,
          type: 'PRESENTATION_MARKED_COMPLETE',
          entryId,
          collectionId,
          metadata: {
            entryTitle: entry.title,
            collectionName: collection.name,
            presentationDate: dateStr
          },
          isPublic: false
        }
      })
      .catch((err) =>
        console.error('[journal-club/present] signal:', err)
      )

    return NextResponse.json(updatedEntry)
  } catch (error) {
    console.error('[journal-club/present]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
