import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Helpful warnings for Neon configurations
(() => {
  const url = process.env.DATABASE_URL || '';
  if (url.includes('neon.tech')) {
    const lower = url.toLowerCase();
    const hasSSL = lower.includes('sslmode=require');
    const hasPgBouncer = lower.includes('pgbouncer=true');
    if (!hasSSL || !hasPgBouncer) {
      console.warn('[prisma] For Neon, it is recommended to enable connection pooling and SSL: append ?sslmode=require&pgbouncer=true to your DATABASE_URL');
    }
  }
})();

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Robust retry wrapper for transient database/network errors
export async function withRetry<T>(fn: () => Promise<T>, retries = 5, baseDelayMs = 400): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Retry on known transient conditions (Neon/Prisma/Node/net)
      const retryableTokens = [
        'P1001', 'P1002', 'P1003', 'P1017',
        'timeout', 'timed out', 'ETIMEDOUT', 'ESOCKETTIMEDOUT',
        'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN',
        'TLS', 'ssl', 'handshake', 'socket', 'network',
        'incomplete envelope', 'wsarecv', 'protocol error',
      ];

      const msg = typeof error === 'string' ? error : (error?.message || '');
      const code = error?.code || '';
      const isRetryable = retryableTokens.some(t =>
        (code && String(code).toUpperCase().includes(t.toUpperCase())) ||
        (msg && msg.toUpperCase().includes(t.toUpperCase()))
      );

      if (!isRetryable || attempt === retries) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 150);
      const delay = baseDelayMs * Math.pow(1.5, attempt) + jitter; // exponential backoff + jitter
      console.warn(`[prisma] transient error, retrying in ~${Math.round(delay)}ms (attempt ${attempt + 1}/${retries})`, {
        code: error?.code, message: error?.message
      });
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw lastError;
}
