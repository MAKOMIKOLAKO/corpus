import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';
import { getCurrentUserId } from '@/lib/session';
import { canUseBatchActions } from '@/lib/plans';
import { removeEntryForUser } from '@/lib/globalEntryService';

function normalizeReadingStatus(value: string) {
  if (value === 'READING') return 'IN_PROGRESS';
  if (value === 'READ') return 'COMPLETED';
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEntryIds, action, payload } = await request.json();

    // Support legacy entryIds for backward compatibility
    const entryIds = userEntryIds;

    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json({ error: 'userEntryIds array is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { allowed, reason } = canUseBatchActions(user.plan);
    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    // Verify ownership of all UserEntries
    const userEntries = await prisma.userEntry.findMany({
      where: {
        id: { in: entryIds },
        userId
      },
      select: { id: true }
    });

    if (userEntries.length !== entryIds.length) {
      return NextResponse.json({ error: 'Some entries were not found or do not belong to you' }, { status: 403 });
    }

    let affected = 0;
    let deletedIds: string[] = [];

    if (action === 'DELETE' || action === 'delete') {
      for (const id of entryIds) {
        try {
          await removeEntryForUser(userId, id);
          deletedIds.push(id);
          affected++;
        } catch (error) {
          console.error(`[api/entries/batch DELETE] Failed to delete userEntry ${id}:`, error);
        }
      }
    }

    else if (action === 'UPDATE_STATUS' || action === 'update_status') {
      const validStatuses = ['UNREAD', 'BACKLOG', 'IN_PROGRESS', 'COMPLETED', 'DROPPED'];
      const rawStatus = payload?.readingStatus || payload?.value;
      const status = typeof rawStatus === 'string' ? normalizeReadingStatus(rawStatus) : rawStatus;
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid reading status' }, { status: 400 });
      }
      const result = await prisma.userEntry.updateMany({
        where: { id: { in: entryIds }, userId },
        data: { readingStatus: status }
      });
      affected = result.count;
    }

    else if (action === 'ADD_TO_COLLECTION' || action === 'add_to_collection') {
      const collectionId = payload?.collectionId || payload?.value;
      if (!collectionId) {
        return NextResponse.json({ error: 'collectionId is required' }, { status: 400 });
      }
      // Check collection ownership
      const collection = await prisma.collection.findFirst({
        where: {
          id: collectionId,
          OR: [
            { userId },
            { members: { some: { userId, status: 'ACCEPTED' } } }
          ]
        }
      });
      if (!collection) {
        return NextResponse.json({ error: 'Collection not found or access denied' }, { status: 403 });
      }

      // Multi-create UserEntryCollection links
      await prisma.userEntryCollection.createMany({
        data: entryIds.map((id: string) => ({
          userEntryId: id,
          collectionId: collectionId
        })),
        skipDuplicates: true
      });
      affected = entryIds.length;
    }

    else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, affected, deletedIds });
  } catch (error) {
    console.error('[api/entries/batch POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
