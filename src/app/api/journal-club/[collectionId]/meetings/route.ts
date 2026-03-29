// AUDIT: 2026-03-28
// Found: POST omitted collection owner for admin check and attendance; owner plan used for canManage; no notes max length; GET 403 for non-member
// Fixed: getJournalClubAccess + getManageRole + actingUserPlan; owner in attendance seed; notes 500 chars; 404 policy; Prisma P2002 on duplicate date

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
const NOTES_MAX = 500

export async function GET(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { collectionId } = params
    if (!collectionId?.trim()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const access = await getJournalClubAccess(collectionId, userId)
    if (!access || !access.isMember) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId }
    })
    if (!collection || !isJournalClub(collection as any)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const meetings = await prisma.journalClubMeeting.findMany({
      where: { collectionId },
      include: {
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json(meetings)
  } catch (error) {
    console.error('[journal-club/meetings GET]:', error)
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { collectionId } = params
    if (!collectionId?.trim()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const access = await getJournalClubAccess(collectionId, userId)
    if (!access || !access.isMember) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId }
    })
    if (!collection || !isJournalClub(collection as any)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { isOwner, membership, actingUserPlan } = access
    const manageRole = getManageRole(isOwner, membership)
    if (!canManageJournalClub(actingUserPlan, manageRole)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const dateRaw = typeof body.date === 'string' ? body.date.trim() : ''
    let notes: string | null = null
    if (body.notes !== undefined && body.notes !== null) {
      const t = String(body.notes).trim()
      if (t.length > NOTES_MAX) {
        return NextResponse.json(
          { error: `Notes must be at most ${NOTES_MAX} characters` },
          { status: 400 }
        )
      }
      notes = t.length ? t : null
    }

    if (!dateRaw) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      return NextResponse.json(
        { error: 'Date must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const meetingDate = new Date(dateRaw + 'T00:00:00.000Z')

    let meeting
    try {
      meeting = await prisma.journalClubMeeting.create({
        data: {
          collectionId,
          date: meetingDate,
          notes
        }
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json(
          { error: 'A meeting already exists for this date' },
          { status: 409 }
        )
      }
      throw e
    }

    const userIds = await getAcceptedMemberAndOwnerUserIds(collectionId)
    await prisma.attendance.createMany({
      data: userIds.map((uid) => ({
        meetingId: meeting.id,
        userId: uid,
        status: 'ABSENT' as const
      })),
      skipDuplicates: true
    })

    const createdMeeting = await prisma.journalClubMeeting.findUnique({
      where: { id: meeting.id },
      include: {
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(createdMeeting)
  } catch (error) {
    console.error('[journal-club/meetings POST]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
