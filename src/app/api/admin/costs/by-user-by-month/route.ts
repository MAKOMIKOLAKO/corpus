import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getCostByUserByMonth } from '@/lib/geminiCost';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const months = Number(searchParams.get('months') || '3');

  try {
    const rows = await getCostByUserByMonth(months);
    return NextResponse.json({ months: Math.min(12, Math.max(1, months)), rows, generatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/costs/by-user-by-month] Failed to load monthly user costs', error);
    return NextResponse.json({ error: 'Failed to load monthly user costs' }, { status: 500 });
  }
}
