import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'No userId provided' }, { status: 400 });
    }
    
    console.log("🚨 DIRECT UPGRADE REQUEST FOR USER:", userId);
    
    // Direct database update - no Stripe verification needed
    const result = await (prisma as any).user.update({
      where: { id: userId },
      data: {
        plan: 'PRO',
        subscriptionStatus: 'active',
      },
    });
    
    console.log("🚨 USER UPGRADED DIRECTLY:", result);
    
    return NextResponse.json({ success: true, user: result });
    
  } catch (error) {
    console.error("🚨 DIRECT UPGRADE ERROR:", error);
    return NextResponse.json({ error: 'Upgrade failed' }, { status: 500 });
  }
}
