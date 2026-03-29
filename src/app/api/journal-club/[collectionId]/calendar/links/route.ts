// AUDIT: 2026-03-28
// Found: Private access ignored owner; no isJournalClub; response was { events }; Google dates used ISO Z range
// Fixed: getJournalClubAccess; 404 if not JC; top-level array { title, date, googleCalendarUrl }; all-day YYYYMMDD dates

import { NextRequest, NextResponse } from 'next/server'
import type { Collection } from '@prisma/client'
import { prisma } from '@/lib/prismaWithRetry'
import { getCurrentUserId } from '@/lib/session'
import { isJournalClub } from '@/lib/journalClub'
import { getJournalClubAccess } from '@/lib/journalClubAccess'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

function formatGoogleDate(dateStr: string): string {
  return dateStr.replace(/-/g, '')
}

function buildGoogleCalendarUrl(
  title: string,
  dateStr: string,
  details: string
): string {
  const googleUrl = new URL('https://calendar.google.com/calendar/render')
  googleUrl.searchParams.set('action', 'TEMPLATE')
  googleUrl.searchParams.set('text', title)
  const d = formatGoogleDate(dateStr)
  googleUrl.searchParams.set('dates', `${d}/${d}`)
  googleUrl.searchParams.set('details', details)
  return googleUrl.toString()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    const { collectionId } = params
    if (!collectionId?.trim()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { isPublic: true, metadata: true }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!isJournalClub(collection as Collection)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!collection.isPublic) {
      const userId = await getCurrentUserId()
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const access = await getJournalClubAccess(collectionId, userId)
      if (!access || !access.isMember) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
    }

    const entryCollections = await prisma.entryCollection.findMany({
      where: { collectionId },
      include: {
        entry: {
          select: {
            title: true,
            abstract: true,
            metadata: true
          }
        }
      }
    })

    const links: {
      title: string
      date: string
      googleCalendarUrl: string
    }[] = []

    for (const ec of entryCollections) {
      const meta = ec.entry.metadata as Record<string, unknown> | null
      if (!meta?.presentationDate) continue

      const dateStr = String(meta.presentationDate)
      const details = `Presenter: ${meta.presenterName || 'TBD'}\n\n${
        ec.entry.abstract || ''
      }`
      links.push({
        title: ec.entry.title,
        date: dateStr,
        googleCalendarUrl: buildGoogleCalendarUrl(
          ec.entry.title,
          dateStr,
          details
        )
      })
    }

    return NextResponse.json(links)
  } catch (error) {
    console.error('[journal-club/calendar/links]:', error)
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
