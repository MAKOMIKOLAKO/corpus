import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaWithRetry';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 });
    }

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 });
    }

    if (verificationToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This verification link has expired.' }, { status: 400 });
    }

    if (verificationToken.usedAt !== null) {
      return NextResponse.json({ error: 'Email already verified.' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('verify-email error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
