import { NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getRevenueMetrics } from '@/lib/adminMetrics';

export async function GET() {
  const { response } = await requireAdminApiSession();

  if (response) {
    return response;
  }

  try {
    const data = await getRevenueMetrics();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/metrics/revenue] Failed to load revenue metrics', error);
    return NextResponse.json({ error: 'Failed to load revenue metrics' }, { status: 500 });
  }
}
