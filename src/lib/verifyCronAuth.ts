import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Authorizes cron/job route requests. Fails closed: a CRON_SECRET must be
 * configured and presented as `Authorization: Bearer <secret>` (or the
 * request must carry Vercel's own `x-vercel-cron` header) in every
 * environment. The only opt-in exception is local development with no
 * CRON_SECRET set at all — production, staging, or an unset/misconfigured
 * NODE_ENV all require the secret.
 */
export function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return process.env.NODE_ENV === 'development'
  }

  const authHeader = request.headers.get('authorization') ?? ''
  if (safeCompare(authHeader, `Bearer ${secret}`)) {
    return true
  }

  return Boolean(request.headers.get('x-vercel-cron'))
}
