import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { getRawGeminiCalls } from '@/lib/geminiCost';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApiSession();
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '50');
  const userId = searchParams.get('userId') || undefined;
  const feature = searchParams.get('feature') || undefined;
  const model = searchParams.get('model') || undefined;
  const success = searchParams.get('success');
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  try {
    const data = await getRawGeminiCalls({
      page,
      limit,
      userId,
      feature,
      model,
      success: success == null ? undefined : success === 'true',
      startDate,
      endDate,
    });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[admin/costs/raw-calls] Failed to load raw Gemini calls', error);
    return NextResponse.json({ error: 'Failed to load raw Gemini calls' }, { status: 500 });
  }
}
