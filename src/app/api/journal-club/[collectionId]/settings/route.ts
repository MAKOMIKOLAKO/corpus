// AUDIT: 2026-03-28
// Found: Owner without membership failed canManage; used owner plan; meetingFrequency not validated
// Fixed: getManageRole(isOwner) + actingUserPlan; frequency enum validation; 404 policy

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'
import { canManageJournalClub, isJournalClub } from '@/lib/journalClub'
import {
  getJournalClubAccess,
  getManageRole
} from '@/lib/journalClubAccess'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }
const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const

export async function PATCH(
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
    if (!collection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { isOwner, membership, actingUserPlan } = access
    const manageRole = getManageRole(isOwner, membership)
    if (!canManageJournalClub(actingUserPlan, manageRole)) {
      return NextResponse.json({ error: 'journal_club_pro_only' }, { status: 403 })
    }

    const existingMeta = (collection.metadata as Record<string, unknown>) || {}
    if (!existingMeta.isJournalClub) {
      return NextResponse.json(
        { error: 'This collection is not a journal club' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { meetingFrequency, nextMeetingDate, meetingDayOfWeek } = body

    if (
      meetingFrequency !== undefined &&
      meetingFrequency !== null &&
      typeof meetingFrequency === 'string' &&
      !FREQUENCIES.includes(meetingFrequency as (typeof FREQUENCIES)[number])
    ) {
      return NextResponse.json(
        { error: 'Invalid meeting frequency' },
        { status: 400 }
      )
    }

    if (
      nextMeetingDate &&
      typeof nextMeetingDate === 'string' &&
      !/^\d{4}-\d{2}-\d{2}$/.test(nextMeetingDate.trim())
    ) {
      return NextResponse.json(
        { error: 'Date must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const updatedMetadata = {
      ...existingMeta,
      ...(meetingFrequency &&
        typeof meetingFrequency === 'string' && {
          meetingFrequency: meetingFrequency.trim()
        }),
      ...(nextMeetingDate &&
        typeof nextMeetingDate === 'string' && {
          nextMeetingDate: nextMeetingDate.trim()
        }),
      ...(meetingDayOfWeek !== undefined && { meetingDayOfWeek })
    }

    const updatedCollection = await prisma.collection.update({
      where: { id: collectionId },
      data: {
        metadata: updatedMetadata
      },
      include: {
        _count: {
          select: { entries: true, members: true }
        },
        members: {
          where: { status: 'ACCEPTED' }
        }
      }
    })

    return NextResponse.json(updatedCollection)
  } catch (error) {
    console.error('[journal-club/settings]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
