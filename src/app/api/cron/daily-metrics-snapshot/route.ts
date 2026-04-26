import { NextRequest, NextResponse } from 'next/server';
import { upsertDailyMetricsSnapshot } from '@/lib/adminMetrics';

const CRON_SECRET = process.env.CRON_SECRET;

function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return true;
  }
  return Boolean(request.headers.get('x-vercel-cron'));
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { metrics } = await upsertDailyMetricsSnapshot(new Date());
    return NextResponse.json({ success: true, date: metrics.date, metrics });
  } catch (error) {
    console.error('[cron/daily-metrics-snapshot] Failed to create snapshot', error);
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
  }
}
