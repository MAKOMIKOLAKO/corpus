import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import stripe from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    console.log("Checkout request received");
    const userId = await getCurrentUserId();
    console.log("User ID:", userId);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, billingCycle } = await request.json();
    console.log("Request body:", { priceId, billingCycle });

    let actualPriceId = priceId;
    if (billingCycle === 'monthly') {
      actualPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    } else if (billingCycle === 'annual') {
      actualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID;
    }

    console.log("Using price ID:", actualPriceId);

    if (!actualPriceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Get user from database
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
    });
    console.log("User from DB:", user);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      console.log("Creating new Stripe customer for user:", user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      await (prisma as any).user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
      console.log("Created customer ID:", customerId);
    } else {
      console.log("Using existing customer ID:", customerId);
    }

    // Create checkout session
    console.log("Creating checkout session with metadata:", { userId: user.id });
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: actualPriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/account/settings?stripe=success`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/pricing`,
      metadata: {
        userId: user.id,
        billingCycle: billingCycle,
      },
      allow_promotion_codes: true,
    });

    console.log("Checkout session created:", session.id);
    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
