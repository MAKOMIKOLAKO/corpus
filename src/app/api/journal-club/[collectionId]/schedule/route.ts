import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = params;

    // Check if user is a member of the collection
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

    // Get all entries in the collection that are not scheduled
    const entryCollections = await prisma.entryCollection.findMany({
      where: { collectionId },
      include: {
        entry: true
      }
    });

    // Filter out entries that are already scheduled
    const unscheduledEntries = entryCollections.filter(ec => {
      const entryMeta = ec.entry.metadata as any;
      return !entryMeta?.presentationDate;
    }).map(ec => ({
      id: ec.id,
      entry: {
        id: ec.entry.id,
        title: ec.entry.title,
        authors: ec.entry.authors,
        year: ec.entry.year
      }
    }));

    return NextResponse.json(unscheduledEntries);
  } catch (error) {
    console.error('Error fetching unscheduled entries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
