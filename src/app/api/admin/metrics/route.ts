import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getOverviewMetrics } from '@/lib/adminMetrics';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();

  if (response) {
    return response;
  }

  try {
    const metrics = await getOverviewMetrics();
    return NextResponse.json(metrics, { headers: { 'Cache-Control': 'max-age=300' } });
  } catch (error) {
    console.error('[admin/metrics] Failed to fetch admin metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
