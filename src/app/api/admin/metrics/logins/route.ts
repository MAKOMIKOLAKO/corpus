import { NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getLoginMetrics } from '@/lib/adminMetrics';

export async function GET() {
  const { response } = await requireAdminApiSession();

  if (response) {
    return response;
  }

  try {
    const data = await getLoginMetrics();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/metrics/logins] Failed to load login metrics', error);
    return NextResponse.json({ error: 'Failed to load login metrics' }, { status: 500 });
  }
}
