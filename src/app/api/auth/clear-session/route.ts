import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL('/signup', req.url));
  const cookieNames = [
    'next-auth.session-token',
    'next-auth.callback-url',
    'next-auth.csrf-token',
    '__Secure-next-auth.session-token',
    '__Host-next-auth.csrf-token',
  ];
  for (const name of cookieNames) {
    res.cookies.set(name, '', { maxAge: 0, path: '/' });
  }
  return res;
}
