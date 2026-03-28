import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { canCreateSharedCollection } from '@/lib/plans';
import { isJournalClub } from '@/lib/journalClub';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      collectionId,
      name,
      description,
      meetingFrequency,
      nextMeetingDate,
      meetingDayOfWeek,
      meetingTime,
      timezone
    } = body;

    // Validate required fields
    if (!meetingFrequency || !nextMeetingDate) {
      return NextResponse.json({ error: 'Meeting frequency and next meeting date are required' }, { status: 400 });
    }

    // Get user to check plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, personalCollectionsCount: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has Pro plan
    if (user.plan !== 'PRO' && user.plan !== 'LIFETIME_PRO') {
      return NextResponse.json({ error: 'journal_club_pro_only' }, { status: 403 });
    }

    let collection;

    if (collectionId) {
      // Convert existing collection to journal club
      collection = await prisma.collection.findUnique({
        where: { id: collectionId },
        include: {
          members: {
            where: {
              userId,
              status: 'ACCEPTED'
            }
          }
        }
      });

      if (!collection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }

      // Check if user is ADMIN (owner of the collection)
      const membership = collection.members[0];
      if (!membership || membership.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Update collection to be journal club
      collection = await prisma.collection.update({
        where: { id: collectionId },
        data: {
          isShared: true, // Journal clubs are always shared
          metadata: {
            isJournalClub: true,
            meetingFrequency,
            nextMeetingDate,
            meetingDayOfWeek,
            meetingTime,
            timezone
          }
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
    } else {
      // Create new collection as journal club
      if (!name?.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      // Check if user can create shared collections
      const { allowed, reason } = canCreateSharedCollection(user.plan);
      if (!allowed) {
        return NextResponse.json({ error: reason }, { status: 403 });
      }

      collection = await prisma.collection.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          isShared: true, // Journal clubs are always shared
          userId,
          metadata: {
            isJournalClub: true,
            meetingFrequency,
            nextMeetingDate,
            meetingDayOfWeek,
            meetingTime,
            timezone
          }
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

      // Create CollectionMember record for creator with role ADMIN
      await prisma.collectionMember.create({
        data: {
          collectionId: collection.id,
          userId,
          role: 'ADMIN',
          invitedBy: userId,
          status: 'ACCEPTED',
          acceptedAt: new Date()
        }
      });
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error creating journal club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
