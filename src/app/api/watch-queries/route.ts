import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const MAX_WATCH_QUERIES_PER_USER = parseInt(process.env.MAX_WATCH_QUERIES_PER_USER || '5');

const createWatchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  collectionId: z.string().optional(),
});

export async function GET() {
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

    const watchQueries = await prisma.watchQuery.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        collection: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            entries: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(watchQueries);
  } catch (error) {
    console.error('Error fetching watch queries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const validatedData = createWatchQuerySchema.parse(body);

    // Check query limit
    const activeQueryCount = await prisma.watchQuery.count({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    if (activeQueryCount >= MAX_WATCH_QUERIES_PER_USER) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_WATCH_QUERIES_PER_USER} active queries allowed` },
        { status: 400 }
      );
    }

    let collectionId = validatedData.collectionId;

    // Auto-create collection if none provided
    if (!collectionId) {
      const collection = await prisma.collection.create({
        data: {
          name: validatedData.query,
          userId: session.user.id,
          isShared: false,
          isPublic: false,
        },
      });
      collectionId = collection.id;
    } else {
      // Verify collection belongs to user
      const collection = await prisma.collection.findFirst({
        where: {
          id: collectionId,
          userId: session.user.id,
        },
      });

      if (!collection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }
    }

    const watchQuery = await prisma.watchQuery.create({
      data: {
        userId: session.user.id,
        query: validatedData.query,
        collectionId,
      },
      include: {
        collection: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(watchQuery, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error creating watch query:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
