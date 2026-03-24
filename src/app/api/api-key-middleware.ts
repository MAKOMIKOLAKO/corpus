import { NextRequest, NextResponse } from 'next/server';

/**
 * API Key Middleware for Next.js API Routes
 * 
 * This middleware validates the x-api-key header against the KEY environment variable.
 * 
 * To use this middleware in your API routes, add the following at the top of your route handler:
 * 
 * import { validateApiKey } from './api-key-middleware';
 * 
 * export async function POST(request: NextRequest) {
 *   const validation = await validateApiKey(request);
 *   if (!validation.valid) {
 *     return validation.response;
 *   }
 *   
 *   // Your route logic here
 * }
 * 
 * Make sure to add KEY to your .env file:
 * KEY=your-secret-api-key-here
 */
export async function validateApiKey(request: NextRequest): Promise<{ valid: boolean; response?: NextResponse }> {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.KEY;

  if (!apiKey) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      )
    };
  }

  if (!expectedKey) {
    console.error('KEY environment variable is not set');
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    };
  }

  if (apiKey !== expectedKey) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    };
  }

  return { valid: true };
}