import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';
import { canAddEntries } from '@/lib/collectionPermissions';
import { corsJsonHeaders, corsOptionsHeaders } from '@/lib/corsHeaders';
import { userEntryWithGlobal, flattenUserEntry } from '@/lib/entryQueries';

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
    // Accept userEntryId (new) or entryId (legacy backward compat)
    let userEntryId = body.userEntryId;

    if (!userEntryId && body.entryId) {
      // Legacy: find UserEntry by old Entry id
      const userEntry = await prisma.userEntry.findFirst({
        where: {
          userId,
          globalEntry: {
            // Match by any deduplication key we can find
            OR: [
              { doi: body.entryId }, // unlikely but safe
            ]
          }
        },
        select: { id: true }
      });
      if (userEntry) userEntryId = userEntry.id;
    }

    if (!userEntryId) {
      return NextResponse.json(
        { error: 'userEntryId is required' },
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

    // Verify UserEntry belongs to current user
    const userEntry = await prisma.userEntry.findFirst({
      where: { id: userEntryId, userId },
      select: { id: true, globalEntryId: true }
    });
    if (!userEntry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404, headers: corsJsonHeaders() }
      );
    }

    // Create UserEntryCollection link
    const link = await prisma.userEntryCollection.upsert({
      where: {
        userEntryId_collectionId: {
          userEntryId,
          collectionId: params.id
        }
      },
      update: {},
      create: { userEntryId, collectionId: params.id },
      include: {
        userEntry: {
          select: userEntryWithGlobal
        },
        collection: true,
      }
    });

    // Emit activity event (fire and forget)
    try {
      const ownerId = collection.userId;
      if (ownerId) {
        prisma.signal
          .create({
            data: {
              userId: ownerId,
              type: 'ENTRY_ADDED_TO_COLLECTION',
              globalEntryId: userEntry.globalEntryId,
              collectionId: params.id,
              metadata: {
                entryTitle: link.userEntry.globalEntry.title,
                collectionName: collection.name,
                collectionIsShared: collection.isShared || false,
                collectionIsPublic: collection.isPublic || false,
              },
            },
          })
          .catch((err) => console.error('Failed to create signal:', err));
      }
    } catch (error) {
      console.error('Failed to create signal:', error);
    }

    return NextResponse.json(flattenUserEntry(link.userEntry), {
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
