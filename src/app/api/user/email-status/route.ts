import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prismaWithRetry';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ emailVerified: true });

    const userId = (session.user as any).id as string;
    if (!userId) return NextResponse.json({ emailVerified: true });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, passwordHash: true },
    });

    if (!user) return NextResponse.json({ emailVerified: true });

    // Google-only users (no passwordHash) are considered verified
    const isGoogleUser = !user.passwordHash;
    if (isGoogleUser) return NextResponse.json({ emailVerified: true });

    return NextResponse.json({ emailVerified: !!user.emailVerified });
  } catch {
    return NextResponse.json({ emailVerified: true });
  }
}
