// AUDIT: 2026-03-28
// Found: Private access ignored collection owner; no isJournalClub check; ICS lines not folded at 75 chars
// Fixed: getJournalClubAccess for private; 404 if not JC; foldICSLine; CRLF throughout; generic 500

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prismaWithRetry'
import { getCurrentUserId } from '@/lib/session'
import type { Collection } from '@prisma/client'
import { isJournalClub } from '@/lib/journalClub'
import { getJournalClubAccess } from '@/lib/journalClubAccess'

export const dynamic = 'force-dynamic'

const GENERIC_500 = { error: 'An unexpected error occurred. Please try again.' }

interface CalendarEvent {
  id: string
  title: string
  description: string
  date: string
}

/** RFC 5545: fold long lines at 75 octets with CRLF + single space on continuation. */
function foldICSLine(line: string): string {
  const max = 75
  if (line.length <= max) return line
  return line.slice(0, max) + '\r\n ' + foldICSLine(line.slice(max))
}

function generateICS(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Corpus//Journal Club//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]

  for (const event of events) {
    const dtStamp = formatICSDateUtc(new Date())
    const start = new Date(event.date + 'T00:00:00.000Z')
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const dtStart = formatICSDateUtc(start)
    const dtEnd = formatICSDateUtc(end)
    lines.push(
      'BEGIN:VEVENT',
      foldICSLine(`UID:${event.id}@usecorpus.app`),
      foldICSLine(`DTSTAMP:${dtStamp}`),
      foldICSLine(`DTSTART:${dtStart}`),
      foldICSLine(`DTEND:${dtEnd}`),
      foldICSLine(`SUMMARY:${escapeICS(event.title)}`),
      foldICSLine(`DESCRIPTION:${escapeICS(event.description)}`),
      'END:VEVENT'
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function formatICSDateUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
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
      select: { isPublic: true, name: true, metadata: true }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!isJournalClub(collection as any)) {
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
            id: true,
            title: true,
            abstract: true,
            metadata: true
          }
        }
      }
    })

    const events: CalendarEvent[] = []
    for (const ec of entryCollections) {
      const entryMeta = ec.entry.metadata as Record<string, unknown> | null
      if (entryMeta?.presentationDate) {
        const dateStr = String(entryMeta.presentationDate)
        const abstract = ec.entry.abstract
        const description = `Presenter: ${entryMeta.presenterName || 'TBD'}\n\n${abstract ? abstract.substring(0, 200) + '...' : 'No abstract available'
          }`

        events.push({
          id: ec.entry.id,
          title: ec.entry.title,
          description,
          date: dateStr
        })
      }
    }

    const icsContent = generateICS(events)

    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="journal-club-${collectionId}.ics"`
      }
    })
  } catch (error) {
    console.error('[journal-club/calendar]:', error)
    return NextResponse.json(GENERIC_500, { status: 500 })
  }
}
