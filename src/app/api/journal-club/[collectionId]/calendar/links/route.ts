import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';

export const dynamic = 'force-dynamic';

interface CalendarEvent {
  title: string;
  googleCalendarUrl: string;
  date: string;
}

function generateGoogleCalendarUrl(title: string, date: string, description: string): string {
  const startDate = new Date(date);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: description
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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
          title: ec.entry.title,
          googleCalendarUrl: generateGoogleCalendarUrl(ec.entry.title, entryMeta.presentationDate, description),
          date: entryMeta.presentationDate
        });
      }
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error generating calendar links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
