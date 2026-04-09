import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import stripe from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account/settings?stripe=portal`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
