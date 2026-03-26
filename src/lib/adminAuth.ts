import { NextRequest, NextResponse } from 'next/server';

export function adminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Decode Basic Auth
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  // Check against environment variables
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.error('Admin credentials not configured in environment variables');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  if (username !== adminUsername || password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  return null; // Success
}

// For use in API routes
export async function validateAdminAuth(request: NextRequest) {
  const authResult = adminAuth(request);
  if (authResult) {
    return authResult;
  }
  return null;
}
