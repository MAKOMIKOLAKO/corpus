import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/adminAuth';
import { rateLimit } from '@/lib/rateLimit';

export async function requireAdminApiSession() {
  const session = await requireAdminSession();

  if (!session?.user?.id) {
    return { session: null, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  const limitResult = rateLimit(`admin:${session.user.id}`, 60, 60 * 1000);

  if (!limitResult.success) {
    return {
      session: null,
      response: NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  return { session, response: null };
}

export function adminNotFoundResponse() {
  return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
