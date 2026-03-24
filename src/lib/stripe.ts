import Stripe from 'stripe';

/**
 * Stripe client initialization
 * 
 * IMPORTANT: Before using this Stripe integration, you must:
 * 1. Create two products in your Stripe dashboard:
 *    - Monthly subscription: $6/month
 *    - Annual subscription: $48/year (billed annually)
 * 2. Copy the Price IDs from the Stripe dashboard
 * 3. Add them to your environment variables:
 *    - STRIPE_MONTHLY_PRICE_ID=price_xxxxxxxxxxxxxx
 *    - STRIPE_ANNUAL_PRICE_ID=price_xxxxxxxxxxxxxx
 * 
 * The Price IDs should look like: price_1Oxxxxxx... (starting with "price_")
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export default stripe;
