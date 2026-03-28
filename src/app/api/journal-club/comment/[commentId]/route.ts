import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import { canManageJournalClub } from '@/lib/journalClub';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId } = params;

    // Get comment with collection and user info
    const comment = await prisma.entryComment.findUnique({
      where: { id: commentId },
      include: {
        collection: {
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
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is the comment author or an admin of the collection
    const isAuthor = comment.userId === userId;
    const membership = comment.collection.members[0];
    const userPlan = comment.collection.user?.plan || 'FREE';
    const isAdmin = membership && canManageJournalClub(userPlan, membership.role);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete comment
    await prisma.entryComment.delete({
      where: { id: commentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
