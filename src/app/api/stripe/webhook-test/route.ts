// Test webhook endpoint - should only be used in development
// This endpoint bypasses signature verification for testing purposes ONLY
// Remove or secure this endpoint before deploying to production

import { rateLimits } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResponse = rateLimits.webhook(request as any);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Test endpoint not available in production' }, { status: 403 });
  }

  try {
    const rawBody = await request.text();
    const sig = request.headers.get('stripe-signature');

    // Log only in development, remove sensitive data in production
    if (process.env.NODE_ENV === 'development') {
      console.log("=== WEBHOOK TEST ====");
      console.log("Signature present:", !!sig);
      console.log("Body length:", rawBody.length);
    }

    if (!sig) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    // Always return success for test
    return Response.json({ received: true, test: "success" }, { status: 200 });

  } catch (error) {
    console.error('Webhook test error:', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({ error: 'Webhook test error' }, { status: 500 });
  }
}
