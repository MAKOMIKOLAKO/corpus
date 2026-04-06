import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';
import { canAddEntries } from '@/lib/collectionPermissions';
import { corsJsonHeaders, corsOptionsHeaders } from '@/lib/corsHeaders';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsOptionsHeaders(),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsJsonHeaders() }
      );
    }

    const body = await request.json();
    const { entryId } = body;

    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400, headers: corsJsonHeaders() }
      );
    }

    const collection = await prisma.collection.findUnique({
      where: { id: params.id },
      include: { members: true },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: corsJsonHeaders() }
      );
    }

    if (!canAddEntries(userId, collection, collection.members)) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: corsJsonHeaders() }
      );
    }

    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
    });

    if (!entry || entry.userId !== userId) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: corsJsonHeaders() }
      );
    }

    const existingEntry = await prisma.entryCollection.findUnique({
      where: {
        entryId_collectionId: {
          entryId,
          collectionId: params.id,
        },
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Entry already in collection' },
        { status: 409, headers: corsJsonHeaders() }
      );
    }

    const entryCollection = await prisma.entryCollection.create({
      data: {
        entryId,
        collectionId: params.id,
      },
      include: {
        entry: true,
        collection: true,
      },
    });

    try {
      const ownerId = collection.userId;
      if (ownerId) {
        prisma.signal
          .create({
            data: {
              userId: ownerId,
              type: 'ENTRY_ADDED_TO_COLLECTION',
              entryId: entryId,
              collectionId: params.id,
              metadata: {
                entryTitle: entry.title,
                collectionName: collection.name,
                collectionIsPublic: collection.isPublic || false,
              },
            },
          })
          .catch((err) => console.error('Failed to create signal:', err));
      }
    } catch (error) {
      console.error('Failed to create signal:', error);
    }

    return NextResponse.json(entryCollection, {
      status: 201,
      headers: corsJsonHeaders(),
    });
  } catch (error: unknown) {
    console.error('[api/collections/[id]/entries POST]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A record with that value already exists.' },
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
