# Debug Output Location Guide

## Where to Find Debug Logs

The alert system uses `console.log()` and `console.error()` for debugging. Here's where to find these outputs:

## 1. Development Environment (Local)

### Terminal/Command Prompt
When running `npm run dev`, logs should appear directly in your terminal:
```bash
npm run dev
```
You should see outputs like:
```
[cron/smart-alerts] Starting alert processing...
[cron/smart-alerts] Environment check: { hasSemanticScholarKey: true, hasGoogleKey: true, nodeEnv: 'development' }
[alertProcessor] Starting alert processing...
[alertProcessor] Processing 3 active queries
```

### Browser Developer Console
For regular API routes (not cron), logs may appear in:
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Find the API request
4. Check the **Response** or **Preview** tab for error messages
5. Check the **Console** tab for client-side errors

### Vercel CLI (if using vercel dev)
If running with `vercel dev`:
```bash
vercel dev
```
Logs appear in the terminal where Vercel is running.

## 2. Production Environment (Vercel)

### Vercel Dashboard Logs
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to the **Logs** tab
4. Filter by:
   - **Function**: `api/cron/smart-alerts` for cron jobs
   - **Status Code**: 4xx or 5xx for errors
   - **Time**: Recent time range

### Real-time Logs
For real-time log streaming:
```bash
vercel logs --follow
```

### Cron Job Logs
Since cron jobs run automatically:
1. In Vercel Dashboard → **Functions** tab
2. Find `/api/cron/smart-alerts`
3. Click on it to see execution logs
4. Check the **Logs** tab after cron runs (scheduled at 8 AM UTC)

## 3. Specific Log Locations

### Cron Job Logs
- File: `src/app/api/cron/smart-alerts/route.ts`
- Log prefix: `[cron/smart-alerts]`
- Key logs:
  - "Starting alert processing..."
  - "Environment check:"
  - "Processing complete:"
  - "Fatal error:"

### Alert Processor Logs
- File: `src/lib/alertProcessor.ts`
- Log prefix: `[alertProcessor]`
- Key logs:
  - "Starting alert processing..."
  - "Processing X active queries"
  - "Found X candidate papers"
  - "X/Y papers deemed relevant after filtering"

### Alert Container Routes
- Files: `src/app/api/alert-containers/**/*.ts`
- Log prefix: `[api/alert-containers ...]`
- Check for errors in these routes

## 4. Troubleshooting Missing Logs

### If No Logs in Development
1. Ensure you're using the correct environment variables:
   ```bash
   # Check if .env.local is being loaded
   echo $CRON_SECRET
   echo $SEMANTIC_SCHOLAR_API_KEY
   ```

2. Try triggering the cron endpoint manually:
   ```bash
   curl -X POST http://localhost:3000/api/cron/smart-alerts \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. Check if Next.js is suppressing logs in `next.config.js`:
   ```javascript
   // Ensure this is NOT set to false
   logging: {
     fetches: { fullUrl: true }
   }
   ```

### If No Logs in Production
1. Check Vercel environment variables:
   - Go to Project → Settings → Environment Variables
   - Ensure all required variables are set

2. Verify cron job is configured:
   - Check `vercel.json` has the cron configuration
   - In Vercel Dashboard → **Cron Jobs** tab

3. Check deployment logs:
   - Vercel Dashboard → **Deployments** → Select latest → **Build Logs**

## 5. Enhanced Logging (Optional)

If you need more detailed logging, you can temporarily add more console.log statements:

```typescript
// In src/app/api/cron/smart-alerts/route.ts
export async function POST(request: NextRequest) {
  console.log('=== CRON JOB STARTED ===');
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  console.log('Timestamp:', new Date().toISOString());
  
  // ... existing code ...
}
```

## 6. Common Issues

### "Logs not showing in Vercel"
- Vercel only keeps logs for a limited time (usually 24-48 hours)
- Use `vercel logs --follow` for real-time streaming
- Consider using a logging service like Logtail or Datadog for persistent logs

### "Cron job runs but no output"
- Check if the cron secret matches
- Verify the environment variables in Vercel dashboard
- The cron might be running but failing early due to missing API keys

### "Error: Request timed out"
- Vercel functions have a 10-second timeout for Hobby/Pro plans
- The alert processor might be taking too long
- Check the `maxDuration` setting in `vercel.json`

## Quick Test Command

To test logging immediately:
```bash
# Test the cron endpoint with curl
curl -X POST http://localhost:3000/api/cron/smart-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET_HERE" \
  -v
```

This should trigger all the console.log statements and show you exactly where the output is going.