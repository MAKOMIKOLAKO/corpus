import { NextRequest, NextResponse } from 'next/server';
import { processAllAlerts } from '@/lib/alertProcessor';

export async function POST(request: NextRequest) {
  try {
    console.log('[test-cron] Starting manual test...');
    
    const results = await processAllAlerts();
    console.log('[test-cron] Manual test complete:', results);

    return NextResponse.json({
      success: true,
      processed: results.queriesProcessed,
      papersAdded: results.totalPapersAdded,
      errors: results.errors
    });
  } catch (error) {
    console.error('[test-cron] Manual test error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
