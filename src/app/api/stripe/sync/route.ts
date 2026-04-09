import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';
import stripe from '@/lib/stripe';

const PRO_STATUSES = new Set<string>([
  'active',
  'trialing',
  'canceling',
  'past_due',
  'unpaid',
]);

function mapSubscriptionStatus(subscription: import('stripe').Stripe.Subscription): string {
  return subscription.cancel_at_period_end ? 'canceling' : subscription.status;
}

function buildSubscriptionUpdateData(
  subscription: import('stripe').Stripe.Subscription,
  currentPlan: 'FREE' | 'PRO' | 'LIFETIME_PRO'
) {
  const subscriptionStatus = mapSubscriptionStatus(subscription);

  return {
    plan:
      currentPlan === 'LIFETIME_PRO'
        ? 'LIFETIME_PRO'
        : PRO_STATUSES.has(subscriptionStatus)
          ? 'PRO'
          : 'FREE',
    subscriptionStatus,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0]?.price?.id ?? null,
    subscriptionEndsAt:
      typeof (subscription as any).current_period_end === 'number'
        ? new Date((subscription as any).current_period_end * 1000)
        : null,
  };
}

function buildNoSubscriptionUpdateData(currentPlan: 'FREE' | 'PRO' | 'LIFETIME_PRO') {
  if (currentPlan === 'LIFETIME_PRO') {
    return {
      plan: 'LIFETIME_PRO' as const,
      subscriptionStatus: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      subscriptionEndsAt: null,
    };
  }

  return {
    plan: 'FREE' as const,
    subscriptionStatus: 'canceled',
    stripeSubscriptionId: null,
    stripePriceId: null,
    subscriptionEndsAt: null,
  };
}

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentPlan = (user.plan ?? 'FREE') as 'FREE' | 'PRO' | 'LIFETIME_PRO';

    if (!user.stripeCustomerId && !user.stripeSubscriptionId) {
      const updateData = buildNoSubscriptionUpdateData(currentPlan);
      const updated = await (prisma as any).user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          plan: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          stripePriceId: true,
          stripeSubscriptionId: true,
        },
      });

      return NextResponse.json({ success: true, source: 'none', user: updated });
    }

    let activeSubscription: import('stripe').Stripe.Subscription | null = null;

    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        if (subscription && subscription.status !== 'canceled') {
          activeSubscription = subscription;
        }
      } catch (error) {
        console.warn('[stripe/sync] failed to retrieve stored subscription', {
          userId: user.id,
          stripeSubscriptionId: user.stripeSubscriptionId,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    if (!activeSubscription && user.stripeCustomerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'all',
        limit: 10,
      });

      const preferred = subscriptions.data.find((sub) => sub.status !== 'canceled');
      activeSubscription = preferred ?? subscriptions.data[0] ?? null;
    }

    if (!activeSubscription || activeSubscription.status === 'canceled') {
      const updateData = buildNoSubscriptionUpdateData(currentPlan);
      const updated = await (prisma as any).user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          plan: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          stripePriceId: true,
          stripeSubscriptionId: true,
        },
      });

      return NextResponse.json({ success: true, source: 'stripe', user: updated });
    }

    const updateData = buildSubscriptionUpdateData(activeSubscription, currentPlan);

    const updated = await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        ...updateData,
        stripeCustomerId: user.stripeCustomerId ?? (activeSubscription.customer as string),
      },
      select: {
        plan: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        stripePriceId: true,
        stripeSubscriptionId: true,
      },
    });

    return NextResponse.json({ success: true, source: 'stripe', user: updated });
  } catch (error) {
    console.error('[stripe/sync] error:', error);
    return NextResponse.json(
      { error: 'Failed to sync subscription state' },
      { status: 500 }
    );
  }
}
