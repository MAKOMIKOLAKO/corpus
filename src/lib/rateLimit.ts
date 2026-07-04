/**
 * In-memory rate limiting for Edge middleware (Map; resets per instance).
 * Optional Upstash: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN and
 * call from a Node runtime (not Edge) if you need distributed limits — Edge
 * cannot bundle @upstash/redis safely for middleware.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { success: true, remaining: limit - record.count, resetAt: record.resetAt };
}

const AUTH_PATHS = new Set([
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/api/auth/callback/credentials",
]);

export function isAuthRateLimitPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname);
}

/** 10 requests / 15 minutes per IP. */
export function checkAuthRateLimit(ip: string): {
  success: boolean;
  remaining: number;
  resetAt: number;
} {
  return rateLimit(`auth:${ip}`, 10, 15 * 60 * 1000);
}

/** 100 requests / minute per userId or IP. */
export function checkApiRateLimit(key: string): {
  success: boolean;
  remaining: number;
  resetAt: number;
} {
  return rateLimit(`api:${key}`, 100, 60 * 1000);
}
