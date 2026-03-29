import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[api/alert-containers GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
