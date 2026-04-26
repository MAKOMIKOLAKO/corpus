import { NextRequest, NextResponse } from 'next/server';
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
    const report = await generateCostReport({ days: 30 });
    const { metrics } = await upsertDailyCostSnapshot(new Date(), report.reportText);
    console.log(`[GEMINI DAILY SUMMARY] date=${metrics.date.toISOString().split('T')[0]} totalCost=$${metrics.totalCost.toFixed(2)} totalCalls=${metrics.totalCalls} uniqueUsers=${metrics.uniqueUsersServed} avgCostPerUser=$${metrics.avgCostPerActiveUser.toFixed(4)} projectedMonthly=$${metrics.projectedMonthlyCost.toFixed(2)} topFeature=${report.summary.topFeature ?? 'none'}`);
    console.log(JSON.stringify({ type: 'gemini_daily_summary', ...report.summary }));
    return NextResponse.json({ success: true, date: metrics.date, metrics, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[cron/cost-snapshot] Failed to create cost snapshot', error);
    return NextResponse.json({ error: 'Failed to create cost snapshot' }, { status: 500 });
  }
}
