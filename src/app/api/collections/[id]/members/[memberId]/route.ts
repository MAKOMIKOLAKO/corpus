import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { canManageCollection } from '@/lib/collectionPermissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, status } = await request.json();

    const member = await prisma.collectionMember.findUnique({
      where: { id: params.memberId },
      include: {
        collection: {
          include: { members: true },
        },
        user: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (role !== undefined) {
      if (!canManageCollection(session.user.id, member.collection)) {
        return NextResponse.json(
          { error: 'You do not have permission to manage this collection' },
          { status: 403 }
        );
      }

      const updatedMember = await prisma.collectionMember.update({
        where: { id: params.memberId },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(updatedMember);
    }

    if (status !== undefined) {
      if (member.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'You can only update your own invite status' },
          { status: 403 }
        );
      }

      const updateData: any = { status };
      if (status === 'ACCEPTED') {
        updateData.acceptedAt = new Date();
      }

      const updatedMember = await prisma.collectionMember.update({
        where: { id: params.memberId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
          collection: {
            select: {
              id: true,
              name: true,
              isShared: true,
              isPublic: true,
            },
          },
        },
      });

      // Emit activity event for joining shared collection
      if (status === 'ACCEPTED' && updatedMember.collection.isShared) {
        await prisma.signal.create({
          data: {
            userId: session.user.id,
            type: 'COLLECTION_MEMBER_JOINED',
            collectionId: updatedMember.collection.id,
            metadata: {
              collectionName: updatedMember.collection.name,
              collectionIsPublic: updatedMember.collection.isPublic,
              newMemberUsername: updatedMember.user.username,
              role: updatedMember.role
            },
            isPublic: updatedMember.collection.isPublic
          }
        });
      }

      return NextResponse.json(updatedMember);
    }

    return NextResponse.json(
      { error: 'Either role or status must be provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const member = await prisma.collectionMember.findUnique({
      where: { id: params.memberId },
      include: {
        collection: {
          include: { members: true },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.collection.userId === member.userId) {
      return NextResponse.json(
        { error: 'Collection owner cannot be removed' },
        { status: 403 }
      );
    }

    const canManage = canManageCollection(session.user.id, member.collection);
    const isSelf = member.userId === session.user.id;

    if (!canManage && !isSelf) {
      return NextResponse.json(
        { error: 'You do not have permission to remove this member' },
        { status: 403 }
      );
    }

    await prisma.collectionMember.delete({
      where: { id: params.memberId },
    });

    const remainingMembers = await prisma.collectionMember.count({
      where: { collectionId: params.id },
    });

    if (remainingMembers === 0) {
      await prisma.collection.update({
        where: { id: params.id },
        data: { isShared: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
