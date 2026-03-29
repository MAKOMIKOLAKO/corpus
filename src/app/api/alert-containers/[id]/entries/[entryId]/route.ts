import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';
import { approveAlertEntry, rejectAlertEntry } from '@/lib/alertContainerActions';

const actionSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const result = parsed.data.action === 'approve'
      ? await approveAlertEntry(userId, params.id, params.entryId)
      : await rejectAlertEntry(userId, params.id, params.entryId);

    const db = prisma as any;
    const pendingCount = await db.alertEntry.count({
      where: {
        containerId: params.id,
        container: { userId },
        status: 'PENDING',
      },
    });

    let containerDeleted = false;
    if (pendingCount === 0) {
      await db.alertContainer.deleteMany({
        where: { id: params.id, userId },
      });
      containerDeleted = true;
    }

    return NextResponse.json({
      success: true,
      result,
      containerDeleted,
      pendingCount,
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[api/alert-containers/[id]/entries/[entryId] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
