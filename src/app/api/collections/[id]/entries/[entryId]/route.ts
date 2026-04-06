import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';
import { canManageCollection } from '@/lib/collectionPermissions';
import { corsJsonHeaders, corsOptionsHeaders } from '@/lib/corsHeaders';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsOptionsHeaders(),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsJsonHeaders() }
      );
    }

    // Check if entry exists and user has access
    const entry = await prisma.entry.findUnique({
      where: { id: params.entryId },
      select: { id: true, title: true, userId: true }
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404, headers: corsJsonHeaders() }
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
        { status: 404, headers: corsJsonHeaders() }
      );
    }

    const canAdd = entry.userId === userId ||
      canManageCollection(userId, collection, collection.members);

    if (!canAdd) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: corsJsonHeaders() }
      );
    }

    // Create the entry-collection link
    const entryCollection = await prisma.entryCollection.create({
      data: {
        entryId: params.entryId,
        collectionId: params.id,
      },
      include: {
        entry: { select: { title: true } },
        collection: { select: { name: true, isShared: true, isPublic: true, publicSlug: true } }
      }
    });

    // Emit activity event for shared collections
    if (collection.isShared) {
      await prisma.signal.create({
        data: {
          userId,
          type: 'ENTRY_ADDED_TO_COLLECTION',
          entryId: params.entryId,
          collectionId: params.id,
          metadata: {
            entryTitle: entry.title,
            collectionName: collection.name,
            collectionIsShared: true,
            collectionIsPublic: collection.isPublic,
            collectionSlug: collection.publicSlug
          },
          isPublic: collection.isPublic
        }
      });
    }

    return NextResponse.json(entryCollection, {
      headers: corsJsonHeaders()
    });

  } catch (error: unknown) {
    console.error('[api/collections/[id]/entries/[entryId] POST]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Entry already in collection' },
          { status: 409, headers: corsJsonHeaders() }
        );
      }
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500, headers: corsJsonHeaders() }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsJsonHeaders() }
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
        { status: 401, headers: corsJsonHeaders() }
      );
    }

    const link = await prisma.entryCollection.findUnique({
      where: {
        entryId_collectionId: {
          entryId: params.entryId,
          collectionId: params.id,
        },
      },
      include: {
        entry: true,
        collection: { include: { members: true } },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: corsJsonHeaders() }
      );
    }

    const canRemove =
      link.entry.userId === userId ||
      canManageCollection(userId, link.collection, link.collection.members);

    if (!canRemove) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: corsJsonHeaders() }
      );
    }

    await prisma.entryCollection.delete({
      where: {
        entryId_collectionId: {
          entryId: params.entryId,
          collectionId: params.id,
        },
      },
    });

    return NextResponse.json(
      { message: 'Entry removed from collection successfully' },
      { headers: corsJsonHeaders() }
    );
  } catch (error: unknown) {
    console.error('[api/collections/[id]/entries/[entryId] DELETE]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500, headers: corsJsonHeaders() }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsJsonHeaders() }
    );
  }
}
