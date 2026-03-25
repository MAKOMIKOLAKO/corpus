import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, expired: false });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.usedAt !== null) {
      return NextResponse.json({ valid: false, expired: false });
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ valid: false, expired: true });
    }

    return NextResponse.json({ valid: true, expired: false });
  } catch (err) {
    console.error('validate-reset-token error:', err);
    return NextResponse.json({ valid: false, expired: false });
  }
}
