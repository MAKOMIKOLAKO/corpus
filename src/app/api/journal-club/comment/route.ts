// AUDIT: 2026-03-28
// Found: No owner membership bypass; 403; awaited signal; no per-route rate limit; canParticipate not enforced explicitly
// Fixed: getJournalClubAccess; 404; canParticipate via role; fire-and-forget signal; jc-comment 20/min

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'
import { canParticipate } from '@/lib/journalClub'
import { getJournalClubAccess, getManageRole } from '@/lib/journalClubAccess'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success } = rateLimit(`jc-comment:${userId}`, 20, 60_000)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : ''
    const collectionId =
      typeof body.collectionId === 'string' ? body.collectionId.trim() : ''
    const content = body.content

    if (!entryId || !collectionId) {
      return NextResponse.json(
        { error: 'Entry ID and collection ID are required' },
        { status: 400 }
      )
    }

    if (content === undefined || content === null) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const trimmedContent =
      typeof content === 'string' ? content.trim() : String(content).trim()
    if (trimmedContent.length === 0) {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 })
    }

    if (trimmedContent.length > 2000) {
      return NextResponse.json(
        { error: 'Comment content cannot exceed 2000 characters' },
        { status: 400 }
      )
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
      },
      include: {
        entry: { select: { title: true } },
        collection: { select: { name: true } }
      }
    })

    if (!entryCollection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const comment = await prisma.entryComment.create({
      data: {
        entryId,
        collectionId,
        userId,
        content: trimmedContent
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    })

    prisma.signal
      .create({
        data: {
          userId,
          type: 'COMMENT_ADDED',
          entryId,
          collectionId,
          metadata: {
            entryTitle: entryCollection.entry.title,
            collectionName: entryCollection.collection.name,
            commentContent: trimmedContent.substring(0, 100)
          },
          isPublic: false
        }
      })
      .catch((err) => console.error('[journal-club/comment] signal:', err))

    return NextResponse.json(comment)
  } catch (error) {
    console.error('[journal-club/comment]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
