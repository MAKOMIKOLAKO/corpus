import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getUsersMetrics } from '@/lib/adminMetrics';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();

  if (response) {
    return response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const data = await getUsersMetrics({
      page: Number(searchParams.get('page') ?? '1'),
      limit: Number(searchParams.get('limit') ?? '25'),
      search: searchParams.get('search') ?? undefined,
      plan: searchParams.get('plan') ?? undefined,
      verified: searchParams.get('verified') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      order: (searchParams.get('order') ?? 'desc') as 'asc' | 'desc',
    });

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/metrics/users] Failed to load users metrics', error);
    return NextResponse.json({ error: 'Failed to load users metrics' }, { status: 500 });
  }
}
