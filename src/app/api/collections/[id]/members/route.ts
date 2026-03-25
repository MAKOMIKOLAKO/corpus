import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { canManageCollection, canAssignAdmin, canShareCollection } from '@/lib/collectionPermissions';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.findUnique({
      where: { id: params.id },
      include: { members: true },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (!canManageCollection(session.user.id, collection)) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this collection' },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'No Corpus account found with that email address' },
        { status: 404 }
      );
    }

    const inviterUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!inviterUser) {
      return NextResponse.json({ error: 'Inviter not found' }, { status: 404 });
    }

    // Prevent inviting yourself
    if (targetUser.id === inviterUser.id) {
      return NextResponse.json(
        { error: 'You cannot invite yourself to a collection' },
        { status: 400 }
      );
    }

    // Prevent attempting to add the collection owner as a member
    if (targetUser.id === collection.userId) {
      return NextResponse.json(
        { error: 'Collection owner is already part of the collection' },
        { status: 400 }
      );
    }

    if (role === 'ADMIN' && !canAssignAdmin(inviterUser, targetUser)) {
      return NextResponse.json(
        { error: 'Admin role requires both users to have Pro accounts' },
        { status: 403 }
      );
    }

    const existingMember = await prisma.collectionMember.findUnique({
      where: {
        collectionId_userId: {
          collectionId: params.id,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this collection' },
        { status: 409 }
      );
    }

    const sharedCollectionsCount = await prisma.collection.count({
      where: {
        userId: collection.userId!,
        isShared: true,
      },
    });

    if (!canShareCollection(inviterUser, sharedCollectionsCount)) {
      return NextResponse.json(
        { error: 'Free accounts can share up to 3 collections. Upgrade to Pro for unlimited.' },
        { status: 403 }
      );
    }

    const member = await prisma.collectionMember.create({
      data: {
        collectionId: params.id,
        userId: targetUser.id,
        role,
        invitedBy: session.user.id,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await prisma.collection.update({
      where: { id: params.id },
      data: { isShared: true },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error inviting member:', error);
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
