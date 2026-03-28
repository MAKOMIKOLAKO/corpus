import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';
import { getCurrentUserId } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await prisma.queueItem.findUnique({
      where: { id: params.id }
    });

    if (!item || item.userId !== userId) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    return NextResponse.json(item);

  } catch (error: any) {
    console.error('Queue item GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch queue item' }, { status: 500 });
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

    const item = await prisma.queueItem.findUnique({
      where: { id: params.id }
    });

    if (!item || item.userId !== userId) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    if (item.status === 'PROCESSING') {
      return NextResponse.json(
        { error: 'Cannot remove an item while it is being processed' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.queueItem.delete({
        where: { id: params.id },
      });

      const remainingItems = await tx.queueItem.findMany({
        where: {
          userId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'asc' },
      });

      for (let i = 0; i < remainingItems.length; i++) {
        await tx.queueItem.update({
          where: { id: remainingItems[i].id },
          data: { position: i + 1 },
        });
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Queue item DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete queue item' }, { status: 500 });
  }
}
