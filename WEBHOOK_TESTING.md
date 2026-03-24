# Webhook Testing Instructions

## 1. Test the Checkout Flow
1. Go to http://localhost:3001/pricing
2. Click "Upgrade to Pro" 
3. Complete a test payment with Stripe test card:
   - Card number: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Name: Test User
   - Email: Your email
4. After payment, check your email for a "Welcome to Corpus Pro!" message
5. Check Vercel logs for webhook events

## 2. Test Webhook Directly
```bash
# Test webhook signature verification (should fail with wrong signature)
curl -X POST http://localhost:3001/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: wrong_signature" \
  -d '{"type": "checkout.session.completed"}'

# Test webhook with correct format (should show in logs)
curl -X POST http://localhost:3001/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "checkout.session.completed", "data": {"metadata": {"userId": "test_user"}}}'
```

## 3. Check Environment Variables
Verify these are set in your .env file:
- STRIPE_WEBHOOK_SECRET should match your Stripe dashboard
- STRIPE_SECRET_KEY should be your test key
- NEXTAUTH_URL should be http://localhost:3001

## 4. Common Issues
1. **Port mismatch**: Make sure you're testing against the right port (3001 vs 3000)
2. **Environment variables**: Ensure webhook secret matches Stripe dashboard exactly
3. **Metadata**: Check that userId is being set in checkout session metadata

## 5. Debug Steps
1. Check Vercel function logs for webhook events
2. Look for "Webhook received:" messages
3. Verify userId appears in session metadata
4. Check database updates in logs
