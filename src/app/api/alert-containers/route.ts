import { getCurrentUserId } from '@/lib/session';
import prisma from '@/lib/prisma';
import { timedJson } from '@/lib/serverTiming';
import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.FEATURE_RESEARCH_FEEDS !== 'enabled') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const startedAt = Date.now();
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return timedJson({ error: 'Unauthorized' }, startedAt, { status: 401 }, 'alert-containers.get');
    }

    const db = prisma as any;
    const containers = await db.alertContainer.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        watchQuery: {
          select: {
            id: true,
            query: true,
            isActive: true,
            maxPapers: true,
          },
        },
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    const containerIds = containers.map((container: any) => container.id);
    const statusRows = containerIds.length > 0
      ? await db.alertEntry.groupBy({
        by: ['containerId', 'status'],
        where: {
          containerId: { in: containerIds },
        },
        _count: { _all: true },
      })
      : [];

    const countsByContainer = new Map<string, { pending: number; approved: number; rejected: number }>();
    for (const row of statusRows) {
      const current = countsByContainer.get(row.containerId) ?? { pending: 0, approved: 0, rejected: 0 };
      if (row.status === 'PENDING') current.pending = row._count._all;
      if (row.status === 'APPROVED') current.approved = row._count._all;
      if (row.status === 'REJECTED') current.rejected = row._count._all;
      countsByContainer.set(row.containerId, current);
    }

    const payload = containers.map((container: any) => {
      const counts = countsByContainer.get(container.id) ?? { pending: 0, approved: 0, rejected: 0 };
      return {
        id: container.id,
        query: container.query,
        collectionId: container.collectionId,
        watchQueryId: container.watchQueryId,
        createdAt: container.createdAt,
        updatedAt: container.updatedAt,
        watchQuery: container.watchQuery,
        counts,
      };
    });

    return timedJson(payload, startedAt, undefined, 'alert-containers.get');
  } catch (error) {
    console.error('[api/alert-containers GET]', error);
    return timedJson({ error: 'Internal server error' }, startedAt, { status: 500 }, 'alert-containers.get');
  }
}
