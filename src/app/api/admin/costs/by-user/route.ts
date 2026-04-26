import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getCostsByUser } from '@/lib/geminiCost';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as 'today' | '7d' | '30d' | 'all') || '30d';
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '25');
  const sort = (searchParams.get('sort') as 'cost' | 'calls' | 'userId') || 'cost';

  try {
    const data = await getCostsByUser({ period, page, limit, sort });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/costs/by-user] Failed to load user costs', error);
    return NextResponse.json({ error: 'Failed to load user costs' }, { status: 500 });
  }
}
