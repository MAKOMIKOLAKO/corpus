import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { ALERT_LIMITS } from '@/lib/alerts';

const updateWatchQuerySchema = z.object({
  isActive: z.boolean().optional(),
  query: z.string().min(1).max(500).optional(),
  collectionId: z.string().optional(),
  maxPapers: z.number().int().min(1).max(10).optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Pro
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (!user || user.plan === 'FREE') {
      return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    }

    const watchQueryId = params.id;

    // Verify the watch query belongs to the user
    const watchQuery = await prisma.watchQuery.findFirst({
      where: {
        id: watchQueryId,
        userId: session.user.id,
      },
    });

    if (!watchQuery) {
      return NextResponse.json({ error: 'Watch query not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    const updatedQuery = await prisma.watchQuery.update({
      where: { id: watchQueryId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Watch query deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating watch query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Pro
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (!user || user.plan === 'FREE') {
      return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateWatchQuerySchema.parse(body);

    // Verify the watch query belongs to the user
    const watchQuery = await prisma.watchQuery.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        collection: { select: { id: true, name: true } }
      }
    });

    if (!watchQuery) {
      return NextResponse.json({ error: 'Watch query not found' }, { status: 404 });
    }

    // If reactivating, check active query limit
    if (validatedData.isActive === true && !watchQuery.isActive) {
      const activeQueryCount = await prisma.watchQuery.count({
        where: {
          userId: session.user.id,
          isActive: true,
        },
      });

      const limits = ALERT_LIMITS[user.plan as keyof typeof ALERT_LIMITS] ?? ALERT_LIMITS.FREE;
      if (activeQueryCount >= limits.maxQueries) {
        return NextResponse.json(
          { error: `Maximum of ${limits.maxQueries} active queries allowed` },
          { status: 403 }
        );
      }
    }

    // If updating collectionId, verify collection belongs to user
    if (validatedData.collectionId && validatedData.collectionId !== watchQuery.collectionId) {
      const collection = await prisma.collection.findFirst({
        where: {
          id: validatedData.collectionId,
          userId: session.user.id,
        },
      });

      if (!collection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }
    }

    // Update the watch query
    const updatedQuery = await prisma.watchQuery.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        collection: { select: { id: true, name: true } },
        _count: { select: { entries: true } }
      }
    });

    return NextResponse.json(updatedQuery);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error updating watch query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
