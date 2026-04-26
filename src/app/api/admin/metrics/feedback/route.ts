import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getFeedbackMetrics } from '@/lib/adminMetrics';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();

  if (response) {
    return response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const data = await getFeedbackMetrics({
      page: Number(searchParams.get('page') ?? '1'),
      limit: Number(searchParams.get('limit') ?? '25'),
      sort: (searchParams.get('sort') ?? 'newest') as 'newest' | 'oldest',
      auth: (searchParams.get('auth') ?? 'all') as 'all' | 'authenticated' | 'anonymous',
      category: searchParams.get('category') ?? undefined,
    });

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/metrics/feedback] Failed to load feedback metrics', error);
    return NextResponse.json({ error: 'Failed to load feedback metrics' }, { status: 500 });
  }
}
