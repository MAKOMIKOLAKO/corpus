import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getCostByUserByDay } from '@/lib/geminiCost';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const period = (searchParams.get('period') as '7d' | '30d') || '30d';

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const data = await getCostByUserByDay(userId, period);
    return NextResponse.json({ userId, period, points: data, generatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/costs/by-user-by-day] Failed to load per-user daily costs', error);
    return NextResponse.json({ error: 'Failed to load per-user daily costs' }, { status: 500 });
  }
}
