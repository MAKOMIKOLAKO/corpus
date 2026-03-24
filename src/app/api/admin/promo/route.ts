import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';

function generatePromoCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user to check admin email
        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if user's email matches ADMIN_EMAIL
        if (user.email !== process.env.ADMIN_EMAIL) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { count } = await request.json();

        if (!count || typeof count !== 'number' || count < 1 || count > 100) {
            return NextResponse.json({ error: 'Invalid count. Must be between 1 and 100.' }, { status: 400 });
        }

        const promoCodes: string[] = [];
        const existingCodes = new Set();

        // Get existing codes to avoid duplicates
        const existingPromoCodes = await (prisma as any).promoCode.findMany({
            select: { code: true }
        });
        existingPromoCodes.forEach((pc: any) => existingCodes.add(pc.code));

        // Generate unique promo codes
        for (let i = 0; i < count; i++) {
            let code;
            let attempts = 0;
            do {
                code = generatePromoCode();
                attempts++;
                if (attempts > 100) {
                    throw new Error('Unable to generate unique promo code after 100 attempts');
                }
            } while (existingCodes.has(code));
            
            existingCodes.add(code);
            promoCodes.push(code);
        }

        // Save promo codes to database
        const createdPromoCodes = await (prisma as any).promoCode.createMany({
            data: promoCodes.map(code => ({ code }))
        });

        return NextResponse.json({ 
            success: true,
            codes: promoCodes,
            count: createdPromoCodes.count
        });

    } catch (error) {
        console.error('Error generating promo codes:', error);
        return NextResponse.json({ error: 'Failed to generate promo codes' }, { status: 500 });
    }
}
