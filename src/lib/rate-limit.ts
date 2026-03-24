import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
}

export function createRateLimit(options: RateLimitOptions) {
  return function rateLimit(request: NextRequest): NextResponse | null {
    // NextRequest doesn't have an 'ip' property, so we use headers
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean up old entries
    for (const key in rateLimitStore) {
      if (rateLimitStore[key].resetTime < now) {
        delete rateLimitStore[key];
      }
    }

    // Check current client's request count
    const clientData = rateLimitStore[clientIp];

    if (!clientData) {
      // First request from this client
      rateLimitStore[clientIp] = {
        count: 1,
        resetTime: now + options.windowMs
      };
      return null; // Allow request
    }

    if (clientData.resetTime < now) {
      // Window has reset
      rateLimitStore[clientIp] = {
        count: 1,
        resetTime: now + options.windowMs
      };
      return null; // Allow request
    }

    if (clientData.count >= options.maxRequests) {
      // Rate limit exceeded
      return NextResponse.json(
        {
          error: options.message || 'Too many requests',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString(),
            'Retry-After': Math.ceil((clientData.resetTime - now) / 1000).toString()
          }
        }
      );
    }

    // Increment count and allow request
    clientData.count++;

    return NextResponse.json(null, {
      headers: {
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': (options.maxRequests - clientData.count).toString(),
        'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString()
      }
    });
  };
}

// Predefined rate limit configurations
export const rateLimits = {
  // Strict rate limiting for authentication endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.'
  }),

  // Moderate rate limiting for general API
  api: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'API rate limit exceeded. Please try again later.'
  }),

  // Lenient rate limiting for data fetching
  read: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200, // 200 requests per 15 minutes
    message: 'Read rate limit exceeded. Please try again later.'
  }),

  // Strict rate limiting for webhook endpoints
  webhook: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 webhooks per minute
    message: 'Webhook rate limit exceeded.'
  })
};
