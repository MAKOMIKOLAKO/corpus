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
    const { collectionId } = body;

    // Validate required fields
    if (!collectionId) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
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

      // Check if user is ADMIN (owner of the collection) or has ADMIN role
      const isOwner = collection.userId === userId;
      const membership = collection.members[0];

      if (!isOwner && (!membership || membership.role !== 'ADMIN')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      // Update collection to be journal club
      collection = await prisma.collection.update({
        where: { id: collectionId },
        data: {
          isShared: true, // Journal clubs are always shared
          metadata: {
            isJournalClub: true
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
      // Creating new journal clubs from scratch is not supported
      return NextResponse.json({ error: 'Only converting existing collections to journal clubs is supported' }, { status: 400 });
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error creating journal club:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
