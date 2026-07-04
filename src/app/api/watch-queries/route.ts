import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { toISOString } from '@/lib/dateUtils';
import { timedJson } from '@/lib/serverTiming';

const MAX_WATCH_QUERIES_PER_USER = parseInt(process.env.MAX_WATCH_QUERIES_PER_USER || '5');

const createWatchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  collectionId: z.string().optional(),
  maxPapers: z.number().int().min(1).max(10).optional(),
});

export async function GET() {
  if (process.env.FEATURE_RESEARCH_FEEDS !== 'enabled') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const startedAt = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'watch-queries.get');
    }

    // Check if user is Pro
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (!user || user.plan === 'FREE') {
      return timedJson({ error: 'Pro plan required' }, startedAt, { status: 403 }, 'watch-queries.get');
    }

    const watchQueries = await prisma.watchQuery.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        userId: true,
        query: true,
        collectionId: true,
        maxPapers: true,
        isActive: true,
        lastCheckedAt: true,
        createdAt: true, // Ensure createdAt is included
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedQueries = watchQueries.map((query) => ({
      ...query,
      createdAt: toISOString(query.createdAt), // Format createdAt as ISO string
    }));

    return timedJson(formattedQueries, startedAt, undefined, 'watch-queries.get');
  } catch (error) {
    console.error('Error fetching watch queries:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'watch-queries.get');
  }
}

export async function POST(request: NextRequest) {
  if (process.env.FEATURE_RESEARCH_FEEDS !== 'enabled') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const startedAt = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'watch-queries.post');
    }

    // Check if user is Pro
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (!user || user.plan === 'FREE') {
      return timedJson({ error: 'Pro plan required' }, startedAt, { status: 403 }, 'watch-queries.post');
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
      return timedJson(
        { error: `Maximum of ${MAX_WATCH_QUERIES_PER_USER} active queries allowed` },
        startedAt,
        { status: 400 },
        'watch-queries.post'
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
        return timedJson({ error: 'Collection not found' }, startedAt, { status: 404 }, 'watch-queries.post');
      }
    }

    const watchQuery = await prisma.watchQuery.create({
      data: {
        userId: session.user.id,
        query: validatedData.query,
        collectionId,
        maxPapers: validatedData.maxPapers ?? 5,
      } as any,
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
    });

    return timedJson(watchQuery, startedAt, { status: 201 }, 'watch-queries.post');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return timedJson({ error: 'Invalid input', details: error.issues }, startedAt, { status: 400 }, 'watch-queries.post');
    }
    console.error('Error creating watch query:', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'watch-queries.post');
  }
}
