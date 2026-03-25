import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Set CORS headers for Chrome extension access
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'chrome-extension://*',
      process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'https://corpus-lemon.vercel.app'
    ];
    
    const isAllowedOrigin = allowedOrigins.some(allowed => 
      allowed === 'chrome-extension://*' || origin === allowed
    );
    
    if (session && session.user) {
      // Return complete user data including plan for extension
      const response = NextResponse.json({
        user: {
          id: (session.user as any).id,
          email: session.user.email,
          name: session.user.name,
          plan: (session.user as any).plan || 'FREE',
          image: session.user.image
        },
        expires: session.expires
      });
      
      // Set CORS headers
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin || allowedOrigins[1] : allowedOrigins[1]);
      response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
      response.headers.set('Vary', 'Origin');
      
      return response;
    } else {
      const response = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin || allowedOrigins[1] : allowedOrigins[1]);
      response.headers.set('Vary', 'Origin');
      return response;
    }
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'chrome-extension://*',
    process.env.NEXTAUTH_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://corpus-lemon.vercel.app'
  ];
  
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    allowed === 'chrome-extension://*' || origin === allowed
  );
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin || allowedOrigins[1] : allowedOrigins[1],
      'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    },
  });
}
