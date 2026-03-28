import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Find the invite
    const invite = await prisma.collectionMember.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        status: 'PENDING',
      },
      include: {
        collection: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (action === 'accept') {
      // Update the invite to accepted
      const updatedMember = await prisma.collectionMember.update({
        where: { id: params.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
        include: {
          collection: true,
          user: true,
        }
      });

      // Emit activity event (Signal)
      await prisma.signal.create({
        data: {
          userId: session.user.id,
          type: 'COLLECTION_MEMBER_JOINED',
          collectionId: updatedMember.collectionId,
          metadata: {
            collectionName: updatedMember.collection.name,
            collectionIsPublic: updatedMember.collection.isPublic,
            newMemberUsername: updatedMember.user.username || updatedMember.user.name || 'A user',
            role: 'ACCEPTED'
          },
          isPublic: updatedMember.collection.isPublic
        }
      });
    } else {
      // Delete the invite for declined
      await prisma.collectionMember.delete({
        where: { id: params.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error responding to invite:', error);
    return NextResponse.json(
      { error: 'Failed to respond to invite' },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
