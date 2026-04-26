import { NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getCostOverview } from '@/lib/geminiCost';

export async function GET() {
  const { response } = await requireAdminApiSession();
  if (response) {
    return response;
  }

  try {
    const data = await getCostOverview();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[admin/costs/overview] Failed to load cost overview', error);
    return NextResponse.json({ error: 'Failed to load cost overview' }, { status: 500 });
  }
}
