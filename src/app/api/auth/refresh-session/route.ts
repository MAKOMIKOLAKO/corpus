import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Create response that will refresh session cookies
  const response = NextResponse.json({ success: true });
  
  // Clear the refresh-session flag
  response.cookies.set('refresh-session', '', { 
    maxAge: 0, 
    path: '/' 
  });

  return response;
}
