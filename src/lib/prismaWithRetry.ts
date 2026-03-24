import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Simple retry wrapper for transient Neon errors
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Retry on known Neon/Prisma transient errors
      const retryableCodes = ['P1001', 'P1002', 'connection', 'timeout'];
      const isRetryable = retryableCodes.some(code => 
        typeof error === 'string' && error.includes(code) ||
        error?.code && retryableCodes.includes(error.code) ||
        error?.message && retryableCodes.some(code => error.message.includes(code))
      );
      if (!isRetryable || i === retries) throw error;
      await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
  throw lastError;
}
