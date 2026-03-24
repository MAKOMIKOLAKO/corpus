import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import stripe from '@/lib/stripe';
import { prisma } from '@/lib/prismaWithRetry';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;

        if (userId) {
          // Update user's subscription info
          await (prisma as any).user.update({
            where: { id: userId },
            data: {
              plan: 'PRO',
              stripeSubscriptionId: session.subscription,
              stripePriceId: session.display_items?.[0]?.price?.id || session.amount_total,
              subscriptionStatus: 'active',
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const user = await (prisma as any).user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          const updateData: any = {
            subscriptionStatus: subscription.status,
          };

          // Update subscription end date if canceling at period end
          if (subscription.cancel_at_period_end) {
            updateData.subscriptionEndsAt = new Date(subscription.current_period_end * 1000);
          }

          await (prisma as any).user.update({
            where: { id: user.id },
            data: updateData,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const user = await (prisma as any).user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          // Set user back to free plan
          await (prisma as any).user.update({
            where: { id: user.id },
            data: {
              plan: 'FREE',
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
              stripePriceId: null,
              subscriptionEndsAt: null,
            },
          });
        }
        break;
      }

      default:
        // Unexpected event type
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Always return a 200 response to acknowledge receipt of the event
    return Response.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
