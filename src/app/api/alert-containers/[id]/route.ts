import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = prisma as any;
    const container = await db.alertContainer.findFirst({
      where: {
        id: params.id,
        userId,
      },
      include: {
        watchQuery: {
          select: {
            id: true,
            query: true,
            isActive: true,
            maxPapers: true,
          },
        },
        entries: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            externalId: true,
            title: true,
            authors: true,
            year: true,
            abstract: true,
            url: true,
            metadata: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const counts = container.entries.reduce(
      (acc: { pending: number; approved: number; rejected: number }, entry: any) => {
        if (entry.status === 'PENDING') acc.pending += 1;
        if (entry.status === 'APPROVED') acc.approved += 1;
        if (entry.status === 'REJECTED') acc.rejected += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );

    return NextResponse.json({
      id: container.id,
      query: container.query,
      collectionId: container.collectionId,
      watchQueryId: container.watchQueryId,
      createdAt: container.createdAt,
      updatedAt: container.updatedAt,
      watchQuery: container.watchQuery,
      counts,
      entries: container.entries,
    });
  } catch (error) {
    console.error('[api/alert-containers/[id] GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const db = prisma as any;
    const container = await db.alertContainer.findFirst({
      where: { id: params.id, userId },
      select: { id: true },
    });

    if (!container) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.alertContainer.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/alert-containers/[id] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
