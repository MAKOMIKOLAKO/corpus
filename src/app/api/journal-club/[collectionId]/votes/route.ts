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

    // Get all entries in this collection
    const entryCollections = await prisma.entryCollection.findMany({
      where: { collectionId },
      include: {
        entry: {
          select: {
            id: true,
            title: true,
            authors: true,
            year: true,
            metadata: true
          }
        }
      }
    });

    // Get vote counts for each entry
    const voteData = await Promise.all(
      entryCollections.map(async (ec) => {
        const entryMeta = ec.entry.metadata as any;
        
        // Skip entries that are already scheduled
        if (entryMeta?.presentationDate && !entryMeta?.presented) {
          return null;
        }

        const voteCount = await prisma.vote.count({
          where: {
            entryId: ec.entryId,
            collectionId
          }
        });

        const userVote = await prisma.vote.findUnique({
          where: {
            entryId_collectionId_userId: {
              entryId: ec.entryId,
              collectionId,
              userId
            }
          }
        });

        return {
          entryId: ec.entryId,
          voteCount,
          userHasVoted: !!userVote,
          entry: ec.entry
        };
      })
    );

    // Filter out null entries (already scheduled ones)
    const filteredVoteData = voteData.filter(item => item !== null);

    // Sort by vote count descending
    filteredVoteData.sort((a, b) => b!.voteCount - a!.voteCount);

    return NextResponse.json(filteredVoteData);
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
