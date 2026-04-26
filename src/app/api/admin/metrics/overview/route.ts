import { NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getOverviewMetrics } from '@/lib/adminMetrics';

export async function GET() {
  const { response } = await requireAdminApiSession();

  if (response) {
    return response;
  }

  try {
    const data = await getOverviewMetrics();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'max-age=300',
      },
    });
  } catch (error) {
    console.error('[admin/metrics/overview] Failed to load overview metrics', error);
    return NextResponse.json({ error: 'Failed to load overview metrics' }, { status: 500 });
  }
}
