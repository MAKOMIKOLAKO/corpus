import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';
import {
  canManageCollection,
  canViewCollection,
} from '@/lib/collectionPermissions';
import { corsJsonHeaders, corsOptionsHeaders } from '@/lib/corsHeaders';
import { userEntryWithGlobal, flattenUserEntry } from '@/lib/entryQueries';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsOptionsHeaders(),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();

    const collection = await prisma.collection.findUnique({
      where: { id: params.id },
      include: {
        userEntryCollections: {
          include: {
            userEntry: {
              select: userEntryWithGlobal
            },
          },
          orderBy: { addedAt: 'desc' },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { invitedAt: 'desc' },
        },
        _count: {
          select: { userEntryCollections: true, members: true },
        },
      },
    } as any);

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404, headers: corsJsonHeaders() }
      );
    }

    if (userId) {
      if (!canViewCollection(userId, collection)) {
        return NextResponse.json(
          { error: 'Not found' },
          { status: 404, headers: corsJsonHeaders() }
        );
      }
    } else if (!collection.isPublic) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsJsonHeaders() }
      );
    }

    const activeAlertCount = await prisma.watchQuery.count({
      where: {
        collectionId: collection.id,
        isActive: true,
      },
    });

    const collectionWithRelations = collection as any

    // Transform userEntries to match expected format
    const transformedCollection = {
      ...collection,
      _count: {
        ...collectionWithRelations._count,
        entries: collectionWithRelations._count?.userEntryCollections ?? collectionWithRelations.userEntryCollections?.length ?? 0,
      },
      entries: collectionWithRelations.userEntryCollections?.map((ue: any) => ({
        ...flattenUserEntry(ue.userEntry),
        addedAt: ue.addedAt
      })) ?? [],
      userEntryCollections: undefined // Remove the old field
    };

    return NextResponse.json(
      { ...transformedCollection, activeAlertCount },
      { headers: corsJsonHeaders() }
    );
  } catch (error) {
    console.error('[api/collections/[id] GET]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsJsonHeaders() }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.collection.findUnique({
      where: { id: params.id },
      include: { members: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!canManageCollection(userId, existing, existing.members)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description } = body as {
      name?: string;
      description?: string | null;
    };

    const collection = await prisma.collection.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && {
          description:
            typeof description === 'string' ? description.trim() || null : null,
        }),
      },
    });

    return NextResponse.json(collection, { headers: corsJsonHeaders() });
  } catch (error) {
    console.error('[api/collections/[id] PATCH]', error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.collection.findUnique({
      where: { id: params.id },
      include: { members: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (!canManageCollection(userId, existing, existing.members)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.collection.delete({
      where: { id: params.id },
    });

    if (!existing.isShared) {
      await prisma.user.update({
        where: { id: userId },
        data: { personalCollectionsCount: { decrement: 1 } }
      });
    }

    return NextResponse.json(
      { message: 'Collection deleted successfully' },
      { headers: corsJsonHeaders() }
    );
  } catch (error) {
    console.error('[api/collections/[id] DELETE]', error);
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
