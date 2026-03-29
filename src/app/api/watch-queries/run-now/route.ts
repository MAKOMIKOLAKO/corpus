import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { processQuery } from '@/lib/alertProcessor';

type QueryRunResult = {
  queryId: string;
  queryText: string;
  collectionId: string;
  papersAdded: number;
  notificationSent: boolean;
  retrievedPapers: Array<{
    id: string;
    title: string;
    doi: string | null;
    url: string | null;
    createdAt: string;
  }>;
  error?: string;
};

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (!user || user.plan === 'FREE') {
      return NextResponse.json({ error: 'Pro plan required' }, { status: 403 });
    }

    const queries = await prisma.watchQuery.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        query: true,
        collectionId: true,
        maxPapers: true,
      },
      orderBy: { createdAt: 'desc' },
    } as any);

    let processed = 0;
    let papersAdded = 0;
    const errors: string[] = [];
    const queryResults: QueryRunResult[] = [];

    for (const query of queries) {
      const queryStartedAt = new Date();
      try {
        const added = await processQuery(query);

        const latestContainer = await (prisma as any).alertContainer.findFirst({
          where: {
            userId: session.user.id,
            watchQueryId: query.id,
            createdAt: {
              gte: queryStartedAt,
            },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        const retrievedPapers = latestContainer
          ? await (prisma as any).alertEntry.findMany({
            where: {
              containerId: latestContainer.id,
              createdAt: {
                gte: queryStartedAt,
              },
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              url: true,
              createdAt: true,
              metadata: true,
            },
            take: 15,
          })
          : [];

        const notificationCount = await prisma.notification.count({
          where: {
            userId: session.user.id,
            type: 'SMART_ALERT',
            createdAt: {
              gte: queryStartedAt,
            },
            message: {
              contains: `"${query.query}"`,
            },
          },
        });

        papersAdded += added;
        processed += 1;
        queryResults.push({
          queryId: query.id,
          queryText: query.query,
          collectionId: query.collectionId,
          papersAdded: added,
          notificationSent: notificationCount > 0,
          retrievedPapers: retrievedPapers.map((paper: any) => ({
            id: paper.id,
            title: paper.title,
            doi: paper.metadata?.doi ?? null,
            url: paper.url,
            createdAt: paper.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        const message = `Query ${query.id}: ${(error as Error).message}`;
        console.error('[watch-queries/run-now]', message);
        errors.push(message);
        queryResults.push({
          queryId: query.id,
          queryText: query.query,
          collectionId: query.collectionId,
          papersAdded: 0,
          notificationSent: false,
          retrievedPapers: [],
          error: message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      papersAdded,
      errors,
      queryResults,
    });
  } catch (error) {
    console.error('[watch-queries/run-now] Fatal error:', error);
    return NextResponse.json({ error: 'Failed to run alerts now' }, { status: 500 });
  }
}
