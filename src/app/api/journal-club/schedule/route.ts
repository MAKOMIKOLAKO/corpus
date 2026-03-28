import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { canManageJournalClub } from '@/lib/journalClub';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { collectionId, entryId, presentationDate, presenterId } = body;

    // Validate required fields
    if (!collectionId || !entryId || !presentationDate || !presenterId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(presentationDate)) {
      return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format' }, { status: 400 });
    }

    // Get collection and check permissions
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        members: {
          where: {
            userId,
            status: 'ACCEPTED'
          }
        },
        user: {
          select: { plan: true }
        }
      }
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if user can manage journal club
    const membership = collection.members[0];
    const userPlan = collection.user?.plan || 'FREE';
    if (!membership || !canManageJournalClub(userPlan, membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify this is a journal club
    const meta = collection.metadata as any;
    if (!meta?.isJournalClub) {
      return NextResponse.json({ error: 'Not a journal club collection' }, { status: 400 });
    }

    // Check if entry belongs to this collection
    const entryCollection = await prisma.entryCollection.findUnique({
      where: {
        entryId_collectionId: {
          entryId,
          collectionId
        }
      }
    });

    if (!entryCollection) {
      return NextResponse.json({ error: 'Entry not found in collection' }, { status: 404 });
    }

    // Check if presenter is a member of the collection
    const presenterMembership = await prisma.collectionMember.findUnique({
      where: {
        collectionId_userId: {
          collectionId,
          userId: presenterId
        }
      }
    });

    if (!presenterMembership || presenterMembership.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Presenter is not a collection member' }, { status: 400 });
    }

    // Check for scheduling conflicts
    const existingEntries = await prisma.entryCollection.findMany({
      where: { collectionId },
      include: { entry: true }
    });

    for (const ec of existingEntries) {
      const entryMeta = ec.entry.metadata as any;
      // Compare date strings directly since both are now in YYYY-MM-DD format
      if (entryMeta?.presentationDate === presentationDate && !entryMeta?.presented) {
        return NextResponse.json({
          error: 'date_already_scheduled',
          message: 'Another paper is already scheduled for that date.'
        }, { status: 409 });
      }
    }

    // Get presenter info for denormalization
    const presenter = await prisma.user.findUnique({
      where: { id: presenterId },
      select: { name: true, username: true }
    });

    if (!presenter) {
      return NextResponse.json({ error: 'Presenter not found' }, { status: 404 });
    }

    // Get entry info for activity event
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      select: { title: true, metadata: true }
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Update entry metadata
    const existingMeta = (entry.metadata as any) || {};
    const updatedEntry = await prisma.entry.update({
      where: { id: entryId },
      data: {
        metadata: {
          ...existingMeta,
          presentationDate,
          presenterId,
          presented: false,
          presenterName: presenter.name || presenter.username
        }
      }
    });

    // Emit ENTRY_SCHEDULED activity event (fire and forget)
    try {
      await prisma.signal.create({
        data: {
          userId,
          type: 'ENTRY_SCHEDULED',
          entryId,
          collectionId,
          metadata: {
            entryTitle: entry.title,
            collectionName: collection.name,
            presentationDate,
            presenterName: presenter.name || presenter.username
          },
          isPublic: false
        }
      });
    } catch (signalError) {
      console.error('Failed to create activity signal:', signalError);
      // Don't fail the request if activity creation fails
    }

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('Error scheduling presentation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
