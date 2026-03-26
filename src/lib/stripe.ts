import Stripe from 'stripe';

/**
 * Stripe client initialization
 * 
 * IMPORTANT: Before using this Stripe integration, you must:
 * 1. Create three products in your Stripe dashboard:
 *    - Monthly subscription: $6/month
 *    - Annual subscription: $48/year (billed annually)
 *    - Lifetime Premium: $30 one-time payment
 * 2. Copy the Price IDs from the Stripe dashboard
 * 3. Add them to your environment variables:
 *    - STRIPE_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxxx
 *    - STRIPE_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxxx
 *    - STRIPE_LIFETIME_PRICE_ID=price_xxxxxxxxxxxxxx
 * 
 * The Price IDs should look like: price_1Oxxxxxx... (starting with "price_")
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16', // Note: use a valid API version if '2026-02-25.clover' is causing type errors. Let's leave it as is if there is no type error, but I'll use standard typing workaround just in case
} as any);

export default stripe;
