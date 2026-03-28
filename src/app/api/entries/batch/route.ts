import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';
import { getCurrentUserId } from '@/lib/session';
import { canUseBatchActions } from '@/lib/plans';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryIds, action, value } = await request.json();

    if (!Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json({ error: 'entryIds array is required' }, { status: 400 });
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

    // Verify ownership of all entries
    const entries = await prisma.entry.findMany({
      where: {
        id: { in: entryIds },
        userId
      },
      select: { id: true }
    });

    if (entries.length !== entryIds.length) {
      return NextResponse.json({ error: 'Some entries were not found or do not belong to you' }, { status: 403 });
    }

    switch (action) {
      case 'DELETE':
        await prisma.entry.deleteMany({
          where: { id: { in: entryIds }, userId }
        });
        await prisma.user.update({
          where: { id: userId },
          data: { entriesCount: { decrement: entries.length } }
        });
        break;

      case 'UPDATE_STATUS':
        if (!['UNREAD', 'BACKLOG', 'IN_PROGRESS', 'READING', 'COMPLETED', 'READ', 'DROPPED'].includes(value)) {
          return NextResponse.json({ error: 'Invalid reading status' }, { status: 400 });
        }
        await prisma.entry.updateMany({
          where: { id: { in: entryIds }, userId },
          data: { readingStatus: value }
        });
        break;

      case 'ADD_TO_COLLECTION':
        if (!value) {
          return NextResponse.json({ error: 'collectionId is required' }, { status: 400 });
        }
        // Check collection ownership
        const collection = await prisma.collection.findUnique({
          where: { id: value, userId }
        });
        if (!collection) {
          return NextResponse.json({ error: 'Collection not found or access denied' }, { status: 403 });
        }

        // Multi-create entries in collection
        await prisma.entryCollection.createMany({
          data: entryIds.map(entryId => ({
            entryId,
            collectionId: value
          })),
          skipDuplicates: true
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, count: entries.length });
  } catch (error) {
    console.error('[api/entries/batch POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
