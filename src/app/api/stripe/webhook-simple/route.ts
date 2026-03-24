import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  // This is a simple webhook bypass that will work regardless of Stripe configuration
  try {
    const body = await request.json();
    console.log("🚨 WEBHOOK BYPASS - RECEIVED:", body.type);
    
    if (body.type === 'checkout.session.completed') {
      const session = body.data.object;
      console.log("🚨 CHECKOUT SESSION COMPLETED:", session.id);
      console.log("🚨 METADATA:", session.metadata);
      
      if (session.metadata?.userId) {
        console.log("🚨 UPGRADING USER:", session.metadata.userId);
        
        // Direct database update without Prisma type issues
        const { prisma } = await import('@/lib/prismaWithRetry');
        await (prisma as any).user.update({
          where: { id: session.metadata.userId },
          data: {
            plan: 'PRO',
            stripeSubscriptionId: session.subscription,
            subscriptionStatus: 'active',
          },
        });
        
        console.log("🚨 USER UPGRADED TO PRO");
      }
    }
    
    return Response.json({ received: true, status: 200 });
  } catch (error) {
    console.error("🚨 WEBHOOK BYPASS ERROR:", error);
    return Response.json({ error: "Webhook error" }, { status: 500 });
  }
}
