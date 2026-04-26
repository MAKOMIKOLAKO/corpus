import { NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getEngagementMetrics } from '@/lib/adminMetrics';

export async function GET() {
  const { response } = await requireAdminApiSession();

  if (response) {
    return response;
  }

  try {
    const data = await getEngagementMetrics();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/metrics/engagement] Failed to load engagement metrics', error);
    return NextResponse.json({ error: 'Failed to load engagement metrics' }, { status: 500 });
  }
}
