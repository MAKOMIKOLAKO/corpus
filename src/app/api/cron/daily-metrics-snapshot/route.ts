import { NextRequest, NextResponse } from 'next/server';
import { upsertDailyMetricsSnapshot } from '@/lib/adminMetrics';
import { generateCostReport, upsertDailyCostSnapshot } from '@/lib/geminiCost';

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
    const report = await generateCostReport({ days: 30 });
    const { metrics: costMetrics } = await upsertDailyCostSnapshot(new Date(), report.reportText);
    console.log(`[GEMINI DAILY SUMMARY] date=${costMetrics.date.toISOString().split('T')[0]} totalCost=$${costMetrics.totalCost.toFixed(2)} totalCalls=${costMetrics.totalCalls} uniqueUsers=${costMetrics.uniqueUsersServed} avgCostPerUser=$${costMetrics.avgCostPerActiveUser.toFixed(4)} projectedMonthly=$${costMetrics.projectedMonthlyCost.toFixed(2)} topFeature=${report.summary.topFeature ?? 'none'}`);
    console.log(JSON.stringify({ type: 'gemini_daily_summary', ...report.summary }));
    return NextResponse.json({ success: true, date: metrics.date, metrics, costMetrics });
  } catch (error) {
    console.error('[cron/daily-metrics-snapshot] Failed to create snapshot', error);
    return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 });
  }
}
