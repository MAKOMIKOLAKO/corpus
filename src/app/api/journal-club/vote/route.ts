// AUDIT: 2026-03-28
// Found: Owner not treated as member; wrong error codes; no P2002 on concurrent vote; awaited signal; no per-route rate limit; generic 500 message
// Fixed: Delegates to executeJournalClubVote; jc-vote rate limit 30/min; Prisma errors mapped; AUDIT header

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { executeJournalClubVote } from '@/lib/journalClubVote'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const collectionId = typeof body.collectionId === 'string' ? body.collectionId.trim() : ''
    const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : ''

    if (!entryId || !collectionId) {
      return NextResponse.json(
        { error: 'Entry ID and collection ID are required' },
        { status: 400 }
      )
    }

    const result = await executeJournalClubVote(userId, collectionId, entryId)
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json({
      action: result.action,
      voteCount: result.voteCount
    })
  } catch (error) {
    console.error('[journal-club/vote]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
