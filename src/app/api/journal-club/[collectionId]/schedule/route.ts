// AUDIT: 2026-03-28
// Found: Debug console.log; owner not considered member on GET
// Fixed: getJournalClubAccess; removed logs

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getCurrentUserId } from '@/lib/session'
import { prisma } from '@/lib/prismaWithRetry'
import { getJournalClubAccess } from '@/lib/journalClubAccess'

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
        entry: true
      }
    })

    if (entryCollections.length === 0) {
      return NextResponse.json([])
    }

    const unscheduledEntries = entryCollections
      .filter((ec) => {
        const entryMeta = ec.entry.metadata as Record<string, unknown> | null
        return !entryMeta?.presentationDate
      })
      .map((ec) => ({
        id: ec.id,
        entry: {
          id: ec.entry.id,
          title: ec.entry.title,
          authors: ec.entry.authors,
          year: ec.entry.year
        }
      }))

    return NextResponse.json(unscheduledEntries)
  } catch (error) {
    console.error('[journal-club/schedule GET]:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(GENERIC_500, { status: 500 })
    }
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
