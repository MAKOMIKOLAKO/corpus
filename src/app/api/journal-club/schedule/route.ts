// AUDIT: 2026-03-28
// Found: Used collection owner plan for canManageJournalClub; notFound vs 403; conflict check blocked reschedule; signals awaited; generic errors
// Fixed: actingUserPlan from getJournalClubAccess; 404 for forbidden; skip conflict for same entryId; fire-and-forget signal; Prisma mapping; trim inputs

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'
import {
  canManageJournalClub,
  isJournalClub
} from '@/lib/journalClub'
import {
  getJournalClubAccess,
  getManageRole
} from '@/lib/journalClubAccess'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const collectionId =
      typeof body.collectionId === 'string' ? body.collectionId.trim() : ''
    const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : ''
    const presentationDate =
      typeof body.presentationDate === 'string'
        ? body.presentationDate.trim()
        : ''
    const presenterId =
      typeof body.presenterId === 'string' ? body.presenterId.trim() : ''

    if (!collectionId || !entryId || !presentationDate || !presenterId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(presentationDate)) {
      return NextResponse.json(
        { error: 'Date must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const access = await getJournalClubAccess(collectionId, userId)
    if (!access) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { isOwner, membership, actingUserPlan } = access
    const manageRole = getManageRole(isOwner, membership)
    if (!canManageJournalClub(actingUserPlan, manageRole)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId }
    })
    if (!collection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!isJournalClub(collection as any)) {
      return NextResponse.json(
        { error: 'This collection is not a journal club' },
        { status: 400 }
      )
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

    if (presenterId !== collection.userId) {
      const presenterMembership = await prisma.collectionMember.findFirst({
        where: {
          collectionId,
          userId: presenterId,
          status: 'ACCEPTED'
        }
      })
      if (!presenterMembership) {
        return NextResponse.json(
          { error: 'Presenter must be a member of this collection' },
          { status: 400 }
        )
      }
    }

    const existingEntries = await prisma.entryCollection.findMany({
      where: { collectionId },
      include: { entry: { select: { id: true, metadata: true } } }
    })

    for (const ec of existingEntries) {
      if (ec.entryId === entryId) continue
      const entryMeta = ec.entry.metadata as Record<string, unknown> | null
      if (
        entryMeta?.presentationDate === presentationDate &&
        !entryMeta?.presented
      ) {
        return NextResponse.json(
          {
            error: 'date_already_scheduled',
            message: 'Another paper is already scheduled for that date.'
          },
          { status: 409 }
        )
      }
    }

    const presenter = await prisma.user.findUnique({
      where: { id: presenterId },
      select: { name: true, username: true }
    })

    if (!presenter) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { title: true, metadata: true }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const existingMeta = (entry.metadata as Record<string, unknown>) || {}
    const updatedEntry = await prisma.entry.update({
      where: { id: entryId },
      data: {
        metadata: {
          ...existingMeta,
          presentationDate,
          presenterId,
          presented: false,
          presenterName: presenter.name || presenter.username
        }
      }
    })

    prisma.signal
      .create({
        data: {
          userId,
          type: 'ENTRY_SCHEDULED',
          entryId,
          collectionId,
          metadata: {
            entryTitle: entry.title,
            collectionName: collection.name,
            presentationDate,
            presenterName: presenter.name || presenter.username
          },
          isPublic: false
        }
      })
      .catch((err) => console.error('[journal-club/schedule] signal:', err))

    return NextResponse.json(updatedEntry)
  } catch (error) {
    console.error('[journal-club/schedule]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A scheduling conflict occurred.' },
          { status: 409 }
        )
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
