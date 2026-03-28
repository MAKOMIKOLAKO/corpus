import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { prisma } from '@/lib/prismaWithRetry';

/**
 * SECURITY AUDIT (Stripe webhooks):
 * - Raw body via request.text() for signature verification (not JSON).
 * - constructEvent before processing; failures return 400 only.
 * - Event type allowlist; unknown types ack with 200.
 * - After verification, always return 200 (log internal errors) to limit retries.
 * - Logs: event.type and ids only — never full payload.
 * - No CSP/header changes in this route file (global next.config excludes webhook from CSP).
 */

const ALLOWED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.created',
] as const;

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return new Response('Invalid body', { status: 400 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: import('stripe').Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'verification failed';
    console.error('[stripe/webhook] signature verification failed:', msg);
    return new Response('Invalid signature', { status: 400 });
  }

  const allowedSet = new Set<string>(ALLOWED_EVENTS);
  if (!allowedSet.has(event.type)) {
    return Response.json({ received: true }, { status: 200 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string | null;
        console.log('[stripe/webhook]', {
          type: event.type,
          userId: userId || undefined,
          customerId: customerId || undefined,
        });

        // Retrieve full session with expanded line_items
        const fullSession = await stripe.checkout.sessions.retrieve(
          session.id,
          { expand: ['line_items'] }
        );

        let user = null;
        if (userId) {
          user = await (prisma as any).user.findUnique({
            where: { id: userId },
          });
        }
        if (!user && customerId) {
          user = await (prisma as any).user.findUnique({
            where: { stripeCustomerId: customerId },
          });
        }

        if (user) {
          const updateData: Record<string, unknown> = {
            plan: 'PRO',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus: 'active',
            stripePriceId: fullSession.line_items?.data[0]?.price?.id ?? null
          };
          await (prisma as any).user.update({
            where: { id: user.id },
            data: updateData,
          });
        } else {
          console.log('[stripe/webhook] checkout.session.completed: no user', {
            customerId,
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as import('stripe').Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log('[stripe/webhook]', {
          type: event.type,
          customerId,
          subscriptionId: subscription.id,
        });

        const user = await (prisma as any).user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          const updateData: Record<string, unknown> = {
            subscriptionStatus: subscription.cancel_at_period_end
              ? 'canceling'
              : subscription.status,
            stripePriceId: subscription.items.data[0]?.price?.id ?? null,
            subscriptionEndsAt: new Date(
              (subscription as any).current_period_end * 1000
            )
          };
          await (prisma as any).user.update({
            where: { id: user.id },
            data: updateData,
          });
        } else {
          console.log('[stripe/webhook] subscription update: no user', {
            customerId,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as import('stripe').Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log('[stripe/webhook]', {
          type: event.type,
          customerId,
          subscriptionId: subscription.id,
        });

        const user = await (prisma as any).user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
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
        } else {
          console.log('[stripe/webhook] subscription.deleted: no user', {
            customerId,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (handlerErr: unknown) {
    const msg = handlerErr instanceof Error ? handlerErr.message : 'unknown';
    console.error('[stripe/webhook] handler error (acked 200):', {
      type: event.type,
      error: msg,
    });
  }

  return Response.json({ received: true }, { status: 200 });
}
