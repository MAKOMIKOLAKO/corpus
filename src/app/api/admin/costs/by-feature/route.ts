import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getCostsByFeature } from '@/lib/geminiCost';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as 'today' | '7d' | '30d' | 'all') || '30d';

  try {
    const data = await getCostsByFeature(period);
    return NextResponse.json({ features: data, generatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/costs/by-feature] Failed to load feature costs', error);
    return NextResponse.json({ error: 'Failed to load feature costs' }, { status: 500 });
  }
}
