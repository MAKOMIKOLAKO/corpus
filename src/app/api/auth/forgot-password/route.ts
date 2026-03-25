import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: true });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 — never reveal if email exists
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Google-only users have no password — silently skip
    if (!user.passwordHash) {
      return NextResponse.json({ success: true });
    }

    // Delete any existing unused reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    try {
      await sendPasswordResetEmail(email, token, user.name || '');
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('forgot-password error:', err);
    return NextResponse.json({ success: true });
  }
}
