import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { canManageJournalClub } from '@/lib/journalClub';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = params;

    // Get collection and user membership
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

    // Check if user is ADMIN (owner of the collection) or has ADMIN role
    const isOwner = collection.userId === userId;
    const membership = collection.members[0];

    if (!isOwner && (!membership || membership.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if user can manage journal club
    const userPlan = collection.user?.plan || 'FREE';
    if (!canManageJournalClub(userPlan, membership?.role || 'VIEWER')) {
      return NextResponse.json({ error: 'journal_club_pro_only' }, { status: 403 });
    }

    // Get existing metadata
    const existingMeta = (collection.metadata as any) || {};

    // Verify this is a journal club
    if (!existingMeta.isJournalClub) {
      return NextResponse.json({ error: 'Not a journal club collection' }, { status: 400 });
    }

    const body = await request.json();
    const {
      meetingFrequency,
      nextMeetingDate,
      meetingDayOfWeek,
      meetingTime,
      timezone
    } = body;

    // Update metadata with new settings
    const updatedMetadata = {
      ...existingMeta,
      ...(meetingFrequency && { meetingFrequency }),
      ...(nextMeetingDate && { nextMeetingDate }),
      ...(meetingDayOfWeek !== undefined && { meetingDayOfWeek }),
      ...(meetingTime && { meetingTime }),
      ...(timezone && { timezone })
    };

    // Update collection
    const updatedCollection = await prisma.collection.update({
      where: { id: collectionId },
      data: {
        metadata: updatedMetadata
      },
      include: {
        _count: {
          select: { entries: true, members: true }
        },
        members: {
          where: { status: 'ACCEPTED' }
        }
      }
    });

    return NextResponse.json(updatedCollection);
  } catch (error) {
    console.error('Error updating journal club settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
