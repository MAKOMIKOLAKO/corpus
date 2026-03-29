// AUDIT: 2026-03-28
// Found: Unused imports; metadata replace dropped existing keys; nextMeetingDate null vs type
// Fixed: Merged existing metadata; full journal club keys; removed dead imports. New collection from body not implemented — only convert (per product); documented here.

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import type { InputJsonValue } from '@prisma/client/runtime/library'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const collectionIdRaw =
      typeof body.collectionId === 'string' ? body.collectionId.trim() : ''

    if (!collectionIdRaw) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, personalCollectionsCount: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (user.plan !== 'PRO' && user.plan !== 'LIFETIME_PRO') {
      return NextResponse.json({ error: 'journal_club_pro_only' }, { status: 403 })
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionIdRaw },
      include: {
        members: {
          where: {
            userId,
            status: 'ACCEPTED'
          }
        }
      }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isOwner = collection.userId === userId
    const membership = collection.members[0]

    if (!isOwner && (!membership || membership.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const activeAlertCount = await prisma.watchQuery.count({
      where: {
        collectionId: collectionIdRaw,
        isActive: true
      }
    })

    if (activeAlertCount > 0) {
      return NextResponse.json(
        { error: 'collection_has_active_alerts' },
        { status: 409 }
      )
    }

    const prevMeta = (collection.metadata as Record<string, unknown>) || {}
    const metadata = {
      ...prevMeta,
      isJournalClub: true,
      meetingFrequency: 'weekly',
      nextMeetingDate: null,
      ...(typeof prevMeta.meetingDayOfWeek === 'number'
        ? { meetingDayOfWeek: prevMeta.meetingDayOfWeek }
        : {})
    } as InputJsonValue
    const collectionUpdated = await prisma.collection.update({
      where: { id: collectionIdRaw },
      data: {
        isShared: true,
        metadata
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

    return NextResponse.json(collectionUpdated)
  } catch (error) {
    console.error('[journal-club/create]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
