import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Create a response that will clear all NextAuth cookies
  const response = NextResponse.json({ success: true });
  
  // Delete the session token to force a refresh
  response.cookies.set('next-auth.session-token', '', {
    maxAge: 0,
    path: '/',
  });
  
  response.cookies.set('next-auth.callback-url', '', {
    maxAge: 0,
    path: '/',
  });
  
  response.cookies.set('next-auth.csrf-token', '', {
    maxAge: 0,
    path: '/',
  });
  
  return response;
}
