import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getGrowthMetrics } from '@/lib/adminMetrics';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();

  if (response) {
    return response;
  }

  const period = (request.nextUrl.searchParams.get('period') ?? '30d') as '7d' | '30d' | '90d' | '1y';

  try {
    const data = await getGrowthMetrics(period);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/metrics/growth] Failed to load growth metrics', error);
    return NextResponse.json({ error: 'Failed to load growth metrics' }, { status: 500 });
  }
}
