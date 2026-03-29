import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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

    if (parsed.data.action === 'approve') {
      const result = await approveAlertEntry(userId, params.id, params.entryId);
      return NextResponse.json({ success: true, result });
    }

    const result = await rejectAlertEntry(userId, params.id, params.entryId);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[api/alert-containers/[id]/entries/[entryId] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
