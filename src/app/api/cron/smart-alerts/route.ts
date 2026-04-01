import { NextRequest, NextResponse } from 'next/server';
import { processAllAlerts } from '@/lib/alertProcessor';

// Verify cron job authorization
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  // Verify this is called by Vercel cron or with correct secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[cron/smart-alerts] Starting alert processing...');
    console.log('[cron/smart-alerts] Environment check:', {
      hasSemanticScholarKey: !!process.env.SEMANTIC_SCHOLAR_API_KEY,
      hasGoogleKey: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
      nodeEnv: process.env.NODE_ENV
    });

    const results = await processAllAlerts();
    console.log('[cron/smart-alerts] Processing complete:', results);

    return NextResponse.json({
      success: true,
      processed: results.queriesProcessed,
      papersAdded: results.totalPapersAdded,
      errors: results.errors.length
    });
  } catch (error) {
    console.error('[cron/smart-alerts] Fatal error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

// Allow GET for testing (but require auth in production)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    // In production, only allow POST with proper authorization
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // For development/testing, allow GET with admin session
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/lib/authOptions');

  const session = await getServerSession(authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 401 });
  }

  try {
    const results = await processAllAlerts();
    console.log('[cron/smart-alerts] Manual trigger complete:', results);

    return NextResponse.json({
      success: true,
      processed: results.queriesProcessed,
      papersAdded: results.totalPapersAdded,
      errors: results.errors
    });
  } catch (error) {
    console.error('[cron/smart-alerts] Manual trigger error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
