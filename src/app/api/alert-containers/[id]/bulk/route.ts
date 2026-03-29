import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/session';
import { approveAlertEntry, rejectAlertEntry } from '@/lib/alertContainerActions';

const bulkSchema = z.object({
  action: z.enum(['approve_all', 'reject_all']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const db = prisma as any;
    const container = await db.alertContainer.findFirst({
      where: { id: params.id, userId },
      select: {
        id: true,
        entries: {
          where: { status: 'PENDING' },
          select: { id: true },
        },
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let processed = 0;
    let failed = 0;

    for (const entry of container.entries) {
      try {
        if (parsed.data.action === 'approve_all') {
          await approveAlertEntry(userId, params.id, entry.id);
        } else {
          await rejectAlertEntry(userId, params.id, entry.id);
        }
        processed += 1;
      } catch (error) {
        failed += 1;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      action: parsed.data.action,
    });
  } catch (error) {
    console.error('[api/alert-containers/[id]/bulk PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
