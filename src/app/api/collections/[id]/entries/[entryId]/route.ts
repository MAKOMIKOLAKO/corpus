import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';
import { canManageCollection } from '@/lib/collectionPermissions';
import { userEntryWithGlobal, flattenUserEntry } from '@/lib/entryQueries';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if UserEntry exists and belongs to user
    const userEntry = await prisma.userEntry.findFirst({
      where: {
        id: params.entryId,
        userId
      },
      select: {
        id: true,
        globalEntry: { select: { title: true } }
      }
    });

    if (!userEntry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Check if collection exists and user has access
    const collection = await prisma.collection.findUnique({
      where: { id: params.id },
      include: { members: true }
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    const canAdd = canManageCollection(userId, collection, collection.members);

    if (!canAdd) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // Create the UserEntryCollection link
    const entryCollection = await prisma.userEntryCollection.create({
      data: {
        userEntryId: params.entryId,
        collectionId: params.id,
      },
      include: {
        userEntry: {
          select: {
            globalEntry: { select: { title: true } }
          }
        },
        collection: { select: { name: true, isShared: true, isPublic: true, publicSlug: true } }
      }
    });

    // Emit activity event for shared collections
    if (collection.isShared) {
      await prisma.signal.create({
        data: {
          userId,
          type: 'ENTRY_ADDED_TO_COLLECTION',
          globalEntryId: userEntry.globalEntry.title ? undefined : undefined, // Need globalEntryId
          collectionId: params.id,
          metadata: {
            entryTitle: userEntry.globalEntry.title,
            collectionName: collection.name,
            collectionIsShared: true,
            collectionIsPublic: collection.isPublic,
            collectionSlug: collection.publicSlug
          },
          isPublic: collection.isPublic
        }
      });
    }

    return NextResponse.json(entryCollection);

  } catch (error: unknown) {
    console.error('[api/collections/[id]/entries/[entryId] POST]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Entry already in collection' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify UserEntry belongs to user
    const userEntry = await prisma.userEntry.findFirst({
      where: { id: params.entryId, userId }
    });

    if (!userEntry) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const link = await prisma.userEntryCollection.findUnique({
      where: {
        userEntryId_collectionId: {
          userEntryId: params.entryId,
          collectionId: params.id,
        },
      },
      include: {
        userEntry: true,
        collection: { include: { members: true } },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const canRemove =
      link.userEntry.userId === userId ||
      canManageCollection(userId, link.collection, link.collection.members);

    if (!canRemove) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.userEntryCollection.delete({
      where: {
        userEntryId_collectionId: {
          userEntryId: params.entryId,
          collectionId: params.id,
        },
      },
    });

    return NextResponse.json(
      { message: 'Entry removed from collection successfully' },
    );
  } catch (error: unknown) {
    console.error('[api/collections/[id]/entries/[entryId] DELETE]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
