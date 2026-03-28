import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entryId, collectionId } = body;

    if (!entryId || !collectionId) {
      return NextResponse.json({ error: 'Entry ID and collection ID are required' }, { status: 400 });
    }

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

    // Check if entry belongs to this collection
    const entryCollection = await prisma.entryCollection.findUnique({
      where: {
        entryId_collectionId: {
          entryId,
          collectionId
        }
      },
      include: {
        entry: true
      }
    });

    if (!entryCollection) {
      return NextResponse.json({ error: 'Entry not found in collection' }, { status: 404 });
    }

    // Check if entry is already scheduled
    const entryMeta = entryCollection.entry.metadata as any;
    if (entryMeta?.presentationDate) {
      return NextResponse.json({ error: 'Cannot vote on already scheduled papers' }, { status: 400 });
    }

    // Check if user has already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        entryId_collectionId_userId: {
          entryId,
          collectionId,
          userId
        }
      }
    });

    let action: 'added' | 'removed';
    let voteCount: number;

    if (existingVote) {
      // Remove vote
      await prisma.vote.delete({
        where: { id: existingVote.id }
      });
      action = 'removed';
      voteCount = await prisma.vote.count({
        where: { entryId, collectionId }
      });
    } else {
      // Add vote
      await prisma.vote.create({
        data: { entryId, collectionId, userId }
      });
      action = 'added';
      voteCount = await prisma.vote.count({
        where: { entryId, collectionId }
      });

      // Emit VOTE_CAST activity event (fire and forget) - only for 1st, 3rd, 5th votes to avoid spam
      if (voteCount === 1 || voteCount === 3 || voteCount === 5) {
        try {
          const collection = await prisma.collection.findUnique({
            where: { id: collectionId },
            select: { name: true }
          });

          if (collection) {
            await prisma.signal.create({
              data: {
                userId,
                type: 'VOTE_CAST',
                entryId,
                collectionId,
                metadata: {
                  entryTitle: entryCollection.entry.title,
                  collectionName: collection.name,
                  voteCount
                },
                isPublic: false
              }
            });
          }
        } catch (signalError) {
          console.error('Failed to create activity signal:', signalError);
          // Don't fail the request if activity creation fails
        }
      }
    }

    return NextResponse.json({ action, voteCount });
  } catch (error) {
    console.error('Error casting vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
