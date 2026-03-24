// Simple test to verify webhook endpoint is working
// Run this with: curl -X POST http://localhost:3001/api/stripe/webhook -H "Content-Type: application/json" -H "stripe-signature: test_signature" -d '{"test": "data"}'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const sig = request.headers.get('stripe-signature');
    
    console.log("=== WEBHOOK TEST ====");
    console.log("Raw body:", rawBody);
    console.log("Signature:", sig);
    console.log("Headers:", Object.fromEntries(request.headers.entries()));
    
    if (!sig) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    // Always return success for test
    return Response.json({ received: true, test: "success" }, { status: 200 });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: 'Webhook error' }, { status: 500 });
  }
}
