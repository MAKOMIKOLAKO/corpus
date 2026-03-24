import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';

export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { code } = await request.json();

        if (!code || typeof code !== 'string') {
            return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
        }

        // Find the promo code
        const promoCode = await (prisma as any).promoCode.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (!promoCode) {
            return NextResponse.json({ error: 'Invalid promo code' }, { status: 404 });
        }

        // Check if the promo code has already been used
        if (promoCode.usedBy) {
            return NextResponse.json({ error: 'Promo code has already been used' }, { status: 400 });
        }

        // Update the promo code as used
        await (prisma as any).promoCode.update({
            where: { id: promoCode.id },
            data: {
                usedBy: userId,
                usedAt: new Date()
            }
        });

        // Update the user's plan to LIFETIME_PRO
        await (prisma as any).user.update({
            where: { id: userId },
            data: { plan: 'LIFETIME_PRO' }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error redeeming promo code:', error);
        return NextResponse.json({ error: 'Failed to redeem promo code' }, { status: 500 });
    }
}
