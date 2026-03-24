import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import stripe from '@/lib/stripe';
import { prisma } from '@/lib/prismaWithRetry';

export async function POST(request: NextRequest) {
  // Log only in development, avoid sensitive data exposure
  if (process.env.NODE_ENV === 'development') {
    console.log("🚨 WEBHOOK CALLED - ANY REQUEST!");
    console.log("URL:", request.url);
    console.log("Headers:", Object.fromEntries(request.headers.entries()));
  }

  try {
    const rawBody = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (process.env.NODE_ENV === 'development') {
      console.log("🚨 RAW BODY:", rawBody);
      console.log("🚨 SIGNATURE:", sig);
    }

    if (!sig) {
      console.log("🚨 NO SIGNATURE FOUND");
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      if (process.env.NODE_ENV === 'development') {
        console.log("🚨 EVENT CONSTRUCTED:", event.type);
      }
    } catch (err: any) {
      console.error('🚨 Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        if (process.env.NODE_ENV === 'development') {
          console.log("Webhook received:", event.type);
        }
        const session = event.data.object as any;

        if (process.env.NODE_ENV === 'development') {
          console.log("Session metadata:", session.metadata);
          console.log("Customer ID:", session.customer);
        }

        const userId = session.metadata?.userId;
        const customerId = session.customer as string;

        if (process.env.NODE_ENV === 'development') {
          console.log("User ID from metadata:", userId);
        }

        let user = null;
        if (userId) {
          user = await (prisma as any).user.findUnique({
            where: { id: userId }
          });
          if (process.env.NODE_ENV === 'development') {
            console.log("User found by ID:", user?.id);
          }
        }

        // Fallback: look up user by Stripe customer ID if metadata.userId is missing
        if (!user && customerId) {
          user = await (prisma as any).user.findUnique({
            where: { stripeCustomerId: customerId }
          });
          if (process.env.NODE_ENV === 'development') {
            console.log("User found by customer ID:", user?.id);
          }
        }

        if (user) {
          if (process.env.NODE_ENV === 'development') {
            console.log("Updating user plan to PRO");
          }
          const updatedUser = await (prisma as any).user.update({
            where: { id: user.id },
            data: {
              plan: 'PRO',
              stripeSubscriptionId: session.subscription as string,
              stripePriceId: session.display_items?.[0]?.price?.id || session.amount_total,
              subscriptionStatus: 'active',
            },
          });
          if (process.env.NODE_ENV === 'development') {
            console.log("Update result:", updatedUser);
          }
        } else {
          console.error("No user found for checkout session");
        }
        break;
      }

      case 'customer.subscription.updated': {
        if (process.env.NODE_ENV === 'development') {
          console.log("Webhook received:", event.type);
        }
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        if (process.env.NODE_ENV === 'development') {
          console.log("Customer ID:", customerId);
        }

        // Find user by Stripe customer ID
        const user = await (prisma as any).user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          if (process.env.NODE_ENV === 'development') {
            console.log("User found:", user.id);
          }
          const updateData: any = {
            subscriptionStatus: subscription.status,
          };

          // Update subscription end date if canceling at period end
          if (subscription.cancel_at_period_end) {
            updateData.subscriptionEndsAt = new Date(subscription.current_period_end * 1000);
          }

          if (process.env.NODE_ENV === 'development') {
            console.log("Updating subscription status to:", updateData);
          }
          await (prisma as any).user.update({
            where: { id: user.id },
            data: updateData,
          });
          if (process.env.NODE_ENV === 'development') {
            console.log("Update completed");
          }
        } else {
          console.error("No user found for customer ID:", customerId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        if (process.env.NODE_ENV === 'development') {
          console.log("Webhook received:", event.type);
        }
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        if (process.env.NODE_ENV === 'development') {
          console.log("Customer ID:", customerId);
        }

        // Find user by Stripe customer ID
        const user = await (prisma as any).user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          if (process.env.NODE_ENV === 'development') {
            console.log("User found:", user.id);
            console.log("Setting user plan back to FREE");
          }
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
          if (process.env.NODE_ENV === 'development') {
            console.log("Plan update completed");
          }
        } else {
          console.error("No user found for customer ID:", customerId);
        }
        break;
      }

      default:
        // Unexpected event type
        if (process.env.NODE_ENV === 'development') {
          console.log(`Unhandled event type: ${event.type}`);
        }
    }

    // Always return a 200 response to acknowledge receipt of the event
    if (process.env.NODE_ENV === 'development') {
      console.log("🚨 WEBHOOK COMPLETED SUCCESSFULLY");
    }
    return Response.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('🚨 WEBHOOK ERROR:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
