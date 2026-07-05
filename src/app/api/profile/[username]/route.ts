import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { username: string } }
) {
  let user: any;
  try {
    user = await prisma.user.findUnique({
      where: { username: params.username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        plan: true,
        isBetaTester: true,
        createdAt: true,
      },
    } as any);
  } catch (error: any) {
    if (error?.code !== 'P2022') throw error;

    user = await prisma.user.findUnique({
      where: { username: params.username },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        plan: true,
        createdAt: true,
      },
    } as any);
  }

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ ...user, isBetaTester: user.isBetaTester ?? false });
}
