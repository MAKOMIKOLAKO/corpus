// AUDIT: 2026-03-28
// Found: GET had no owner bypass; 403 on non-member; wrong scheduled filter; N+1 counts; POST missing (UI calls POST here)
// Fixed: getJournalClubAccess; 404; exclude any presentationDate; groupBy + user votes; POST delegates to executeJournalClubVote; rate limit on POST

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'
import { getJournalClubAccess } from '@/lib/journalClubAccess'
import { executeJournalClubVote } from '@/lib/journalClubVote'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

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

    const entryCollections = await prisma.entryCollection.findMany({
      where: { collectionId },
      include: {
        entry: {
          select: {
            id: true,
            title: true,
            authors: true,
            year: true,
            metadata: true
          }
        }
      }
    })

    const eligible = entryCollections.filter((ec) => {
      const entryMeta = ec.entry.metadata as Record<string, unknown> | null
      return !entryMeta?.presentationDate
    })

    if (eligible.length === 0) {
      return NextResponse.json([])
    }

    const eligibleEntryIds = eligible.map((ec) => ec.entryId)

    const [counts, userVotes] = await Promise.all([
      prisma.vote.groupBy({
        by: ['entryId'],
        where: {
          collectionId,
          entryId: { in: eligibleEntryIds }
        },
        _count: { id: true }
      }),
      prisma.vote.findMany({
        where: {
          collectionId,
          userId,
          entryId: { in: eligibleEntryIds }
        },
        select: { entryId: true }
      })
    ])

    const countByEntry = new Map(counts.map((c) => [c.entryId, c._count.id]))
    const userVotedIds = new Set(userVotes.map((v) => v.entryId))

    const filteredVoteData = eligible.map((ec) => ({
      entryId: ec.entryId,
      voteCount: countByEntry.get(ec.entryId) ?? 0,
      userHasVoted: userVotedIds.has(ec.entryId),
      entry: ec.entry
    }))

    filteredVoteData.sort((a, b) => b.voteCount - a.voteCount)

    return NextResponse.json(filteredVoteData)
  } catch (error) {
    console.error('[journal-club/votes GET]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
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

    const { success } = rateLimit(`jc-vote:${userId}`, 30, 60_000)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }

    const { collectionId } = params
    const trimmedCollectionId = collectionId?.trim() ?? ''
    if (!trimmedCollectionId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const entryId =
      typeof body.entryId === 'string' ? body.entryId.trim() : ''

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    const result = await executeJournalClubVote(
      userId,
      trimmedCollectionId,
      entryId
    )
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json({
      action: result.action,
      voteCount: result.voteCount
    })
  } catch (error) {
    console.error('[journal-club/votes POST]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
