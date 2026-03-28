import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';
import { sendPasswordResetEmail } from '@/lib/email';
import { forgotPasswordBodySchema } from '@/lib/validation';
import crypto from 'crypto';

const MIN_RESPONSE_MS = 500;

async function ensureMinDelay(startedAt: number, ms: number) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < ms) {
    await new Promise((r) => setTimeout(r, ms - elapsed));
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = forgotPasswordBodySchema.safeParse(raw);
    if (!parsed.success) {
      await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
      return NextResponse.json({ success: true });
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
      return NextResponse.json({ success: true });
    }

    if (!user.passwordHash) {
      await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
      return NextResponse.json({ success: true });
    }

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // SECURITY AUDIT: 64-char hex from 32 bytes (not Math.random).
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    try {
      await sendPasswordResetEmail(email, token, user.name || '');
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr);
    }

    await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('forgot-password error:', err);
    await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
    return NextResponse.json({ success: true });
  }
}
