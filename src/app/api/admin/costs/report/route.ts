import { NextResponse } from 'next/server';
import { requireAdminApiSession } from '@/lib/adminApi';
import { generateCostReport } from '@/lib/geminiCost';

export async function POST() {
  const { response } = await requireAdminApiSession();
  if (response) {
    return response;
  }

  try {
    const { reportText } = await generateCostReport({ days: 30 });
    const datePart = new Date().toISOString().split('T')[0];
    return new NextResponse(reportText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="corpus-cost-report-${datePart}.txt"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[admin/costs/report] Failed to generate cost report', error);
    return NextResponse.json({ error: 'Failed to generate cost report' }, { status: 500 });
  }
}
