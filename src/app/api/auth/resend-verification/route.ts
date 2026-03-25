import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prismaWithRetry';
import { sendVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    // Rate limit: one resend per 5 minutes
    const recent = await prisma.emailVerificationToken.findFirst({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (recent.createdAt > fiveMinutesAgo) {
        return NextResponse.json(
          { error: 'Please wait a few minutes before requesting another verification email.' },
          { status: 429 }
        );
      }
    }

    // Delete existing unused tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId, usedAt: null },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: { token, userId, expiresAt },
    });

    await sendVerificationEmail(user.email, token, user.name || '');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('resend-verification error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
