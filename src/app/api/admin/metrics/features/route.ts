import { NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getFeaturesMetrics } from '@/lib/adminMetrics';

export async function GET() {
  const { response } = await requireAdminApiSession();

  if (response) {
    return response;
  }

  try {
    const data = await getFeaturesMetrics();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/metrics/features] Failed to load features metrics', error);
    return NextResponse.json({ error: 'Failed to load features metrics' }, { status: 500 });
  }
}
