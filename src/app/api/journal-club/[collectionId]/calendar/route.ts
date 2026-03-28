import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';

export const dynamic = 'force-dynamic';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
}

function generateICS(events: CalendarEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Corpus//Journal Club//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    const dtStamp = formatICSDate(new Date());
    const dtStart = formatICSDate(new Date(event.date));
    const dtEnd = formatICSDate(
      new Date(new Date(event.date).getTime() + 60 * 60 * 1000)
    ); // 1 hour duration default
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@usecorpus.app`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(event.description)}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;')
    .replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    const { collectionId } = params;

    // Get collection to check if it's public
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: { isPublic: true, name: true }
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // If collection is private, check authentication and membership
    if (!collection.isPublic) {
      const userId = await getCurrentUserId();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const membership = await prisma.collectionMember.findUnique({
        where: {
          collectionId_userId: {
            collectionId,
            userId
          }
        }
      });

      if (!membership || membership.status !== 'ACCEPTED') {
        return NextResponse.json({ error: 'Not a member of this collection' }, { status: 403 });
      }
    }

    // Get all entries in this collection with presentation dates
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
    });

    // Build calendar events from scheduled entries
    const events: CalendarEvent[] = [];
    for (const ec of entryCollections) {
      const entryMeta = ec.entry.metadata as any;
      if (entryMeta?.presentationDate) {
        const description = `Presenter: ${entryMeta.presenterName || 'TBD'}\n\n${
          ec.entry.abstract ? ec.entry.abstract.substring(0, 200) + '...' : 'No abstract available'
        }`;

        events.push({
          id: ec.entry.id,
          title: ec.entry.title,
          description,
          date: entryMeta.presentationDate
        });
      }
    }

    // Generate ICS content
    const icsContent = generateICS(events);

    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="journal-club-${collectionId}.ics"`
      }
    });
  } catch (error) {
    console.error('Error generating calendar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
