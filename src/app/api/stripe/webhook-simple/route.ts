import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint has been removed. Use /api/stripe/webhook with Stripe signature verification.',
    },
    { status: 410 }
  );
}
