# STRIPE WEBHOOK NOT WORKING - IMMEDIATE FIXES

## The Problem
No webhook events are being logged = Stripe is not sending webhooks to your endpoint.

## Immediate Fixes (Do These Now)

### 1. Check Your Stripe Dashboard Webhook Configuration
1. Go to https://dashboard.stripe.com/webhooks
2. Look at your webhook endpoint - what URL is it pointing to?
3. **CRITICAL**: The URL should be: `https://your-domain.com/api/stripe/webhook`
4. NOT: `http://localhost:3001/api/stripe/webhook`

### 2. Test Webhook Endpoint Directly
Replace `your-domain.com` with your actual deployed domain:
```bash
curl -X POST https://your-domain.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type": "test"}'
```

### 3. Add Emergency Debugging
Add this to the TOP of your webhook route (before any other code):
```javascript
export async function POST(request: Request) {
  console.log("🚨 WEBHOOK CALLED - ANY REQUEST!");
  console.log("URL:", request.url);
  console.log("Headers:", Object.fromEntries(request.headers.entries()));
  
  try {
    // ... rest of your existing code
  } catch (error) {
    console.error("🚨 WEBHOOK ERROR:", error);
    return Response.json({ error: "Webhook error" }, { status: 500 });
  }
}
```

### 4. Verify Environment Variables
In Vercel dashboard, ensure:
- `STRIPE_WEBHOOK_SECRET` matches exactly what's in Stripe dashboard
- `STRIPE_SECRET_KEY` is your LIVE key (not test key)

### 5. Test with Stripe CLI (Advanced)
If you have Stripe CLI:
```bash
stripe listen --forward-to https://your-domain.com/api/stripe/webhook
```

## Most Likely Issues
1. **Wrong webhook URL in Stripe dashboard**
2. **Environment variables not set in Vercel**
3. **Using test keys instead of live keys**
4. **Network/firewall blocking webhooks**

## Quick Test
1. Deploy the emergency debugging code
2. Run the curl command above
3. Check Vercel logs for "🚨 WEBHOOK CALLED" message

If you see the message, the endpoint works - the issue is Stripe configuration.
If you don't see the message, the endpoint is not accessible.
