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
    const { entryId, collectionId, content } = body;

    if (!entryId || !collectionId || !content) {
      return NextResponse.json({ error: 'Entry ID, collection ID, and content are required' }, { status: 400 });
    }

    // Validate content
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    if (trimmedContent.length > 2000) {
      return NextResponse.json({ error: 'Comment content cannot exceed 2000 characters' }, { status: 400 });
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
        entry: true,
        collection: true
      }
    });

    if (!entryCollection) {
      return NextResponse.json({ error: 'Entry not found in collection' }, { status: 404 });
    }

    // Create comment
    const comment = await prisma.entryComment.create({
      data: {
        entryId,
        collectionId,
        userId,
        content: trimmedContent
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true
          }
        }
      }
    });

    // Emit COMMENT_ADDED activity event (fire and forget)
    try {
      await prisma.signal.create({
        data: {
          userId,
          type: 'COMMENT_ADDED',
          entryId,
          collectionId,
          metadata: {
            entryTitle: entryCollection.entry.title,
            collectionName: entryCollection.collection.name,
            commentContent: trimmedContent.substring(0, 100) // First 100 chars
          },
          isPublic: false
        }
      });
    } catch (signalError) {
      console.error('Failed to create activity signal:', signalError);
      // Don't fail the request if activity creation fails
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
