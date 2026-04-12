import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getConfiguredCorsOrigin } from '@/lib/corsHeaders';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const corsOrigin = getConfiguredCorsOrigin();

    if (session && session.user) {
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

      response.headers.set('Access-Control-Allow-Origin', corsOrigin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Vary', 'Origin');

      return response;
    }
    const response = NextResponse.json(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', corsOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Vary', 'Origin');
    return response;
  } catch (error) {
    console.error('[api/auth/session GET]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  const corsOrigin = getConfiguredCorsOrigin();
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    },
  });
}
