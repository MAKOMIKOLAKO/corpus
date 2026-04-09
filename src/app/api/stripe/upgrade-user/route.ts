import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint has been removed. Subscription state is managed via Stripe webhook and /api/stripe/sync.',
    },
    { status: 410 }
  );
}
