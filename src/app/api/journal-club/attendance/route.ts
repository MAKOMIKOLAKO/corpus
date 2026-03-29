// AUDIT: 2026-03-28
// Found: Own attendance did not verify collection membership; owner plan for admin; target owner not in members table rejected
// Fixed: Meeting+collection gate for all; actingUserPlan + isOwner for manage; owner as valid target; rate limit; Prisma errors

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'
import { canManageJournalClub } from '@/lib/journalClub'
import {
  getJournalClubAccess,
  getManageRole
} from '@/lib/journalClubAccess'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = rateLimit(`jc-attendance:${userId}`, 60, 60_000)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const meetingId =
      typeof body.meetingId === 'string' ? body.meetingId.trim() : ''
    const targetUserId =
      typeof body.userId === 'string' ? body.userId.trim() : ''
    const status = body.status

    if (!meetingId || !targetUserId || status === undefined || status === null) {
      return NextResponse.json(
        { error: 'Meeting ID, user ID, and status are required' },
        { status: 400 }
      )
    }

    if (!['PRESENT', 'ABSENT', 'EXCUSED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const meeting = await prisma.journalClubMeeting.findUnique({
      where: { id: meetingId },
      include: {
        collection: { select: { id: true, userId: true } }
      }
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const collectionId = meeting.collectionId

    const access = await getJournalClubAccess(collectionId, userId)
    if (!access || !access.isMember) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (targetUserId !== userId) {
      const { isOwner, membership, actingUserPlan } = access
      const manageRole = getManageRole(isOwner, membership)
      if (!canManageJournalClub(actingUserPlan, manageRole)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    const coll = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { userId: true }
    })
    const isTargetOwner = coll?.userId === targetUserId
    const targetMembership = await prisma.collectionMember.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId: targetUserId
        }
      }
    })
    if (
      !isTargetOwner &&
      (!targetMembership || targetMembership.status !== 'ACCEPTED')
    ) {
      return NextResponse.json(
        { error: 'Target user is not a member of this collection' },
        { status: 400 }
      )
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        meetingId_userId: {
          meetingId,
          userId: targetUserId
        }
      },
      update: {
        status,
        recordedAt: new Date()
      },
      create: {
        meetingId,
        userId: targetUserId,
        status
      }
    })

    return NextResponse.json(attendance)
  } catch (error) {
    console.error('[journal-club/attendance]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Could not update attendance' },
          { status: 409 }
        )
      }
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
