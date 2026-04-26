import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getCostSeries } from '@/lib/geminiCost';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as '7d' | '30d' | '90d' | '1y') || '30d';

  try {
    const data = await getCostSeries(period);
    return NextResponse.json({ period, points: data, generatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/costs/by-day] Failed to load cost series', error);
    return NextResponse.json({ error: 'Failed to load cost series' }, { status: 500 });
  }
}
