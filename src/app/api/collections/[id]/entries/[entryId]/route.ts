import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';
import { canManageCollection } from '@/lib/collectionPermissions';
import { corsJsonHeaders, corsOptionsHeaders } from '@/lib/corsHeaders';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsOptionsHeaders(),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const validation = await validateApiKey(request);
    if (!validation.valid) {
      return validation.response;
    }

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
