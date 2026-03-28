import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';
import bcrypt from 'bcryptjs';
import { resetPasswordBodySchema } from '@/lib/validation';

const MIN_RESPONSE_MS = 200;

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
    const parsed = resetPasswordBodySchema.safeParse(raw);
    if (!parsed.success) {
      await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { token, password } = parsed.data;

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    if (resetToken.expiresAt < new Date()) {
      await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
      return NextResponse.json(
        { error: 'This reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (resetToken.usedAt !== null) {
      await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
      return NextResponse.json(
        { error: 'This reset link has already been used.' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('reset-password error:', err);
    await ensureMinDelay(startedAt, MIN_RESPONSE_MS);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
