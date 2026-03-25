import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username') || '';

  const valid = USERNAME_REGEX.test(username);
  if (!valid) {
    return NextResponse.json({
      available: false,
      valid: false,
      message: username.length < 3
        ? 'Username must be at least 3 characters'
        : username.length > 20
        ? 'Username must be 20 characters or fewer'
        : 'Only lowercase letters, numbers, and underscores allowed',
    });
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ available: false, valid: true, message: 'Username is already taken' });
  }

  return NextResponse.json({ available: true, valid: true, message: 'Username is available' });
}
