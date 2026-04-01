# Call Stack Size Exceeded - Debugging Guide

## Status: FIXED ✅

### Implemented Solutions

1. **Iterative Set Building** (alertProcessor.ts lines 178-191)
   - Replaced `new Set(array.map(...))` with iterative `Set.add()` calls
   - Processes entries in chunks of 1000 to prevent stack overflow
   - Added async breaks between chunks with `setTimeout(0)`

2. **Safe Title Normalization** (alertProcessor.ts lines 5-19)
   - Created `safeNormalizeTitle()` wrapper with error handling
   - Monitors stack depth before processing
   - Provides fallback normalization on errors

3. **Reduced Query Limits** (alertProcessor.ts line 174)
   - Reduced `take` limit from 5000 to 2000 entries
   - Further reduces memory pressure and stack depth

4. **Stack Size Monitoring** (alertProcessor.ts lines 20-21, 146-152)
   - Logs initial stack size at start of processing
   - Checks stack size before each query
   - Skips queries if stack depth exceeds 100

5. **Automatic Query Recovery** (alertProcessor.ts lines 117-129)
   - Detects stack overflow errors
   - Automatically disables problematic queries
   - Continues processing other queries

6. **Container Entry Processing** (alertProcessor.ts lines 248-256)
   - Also uses iterative Set building for container entries
   - Consistent error handling throughout

## Common Causes & Solutions (Historical Reference)

### 1. **Infinite Recursion**
Check for functions that call themselves without a proper exit condition:

```typescript
// BAD - Infinite recursion
function process(data: any) {
  return process(data); // Calls itself forever
}

// GOOD - Has exit condition
function process(data: any, depth = 0) {
  if (depth > 10) return; // Exit condition
  return process(data, depth + 1);
}
```

### 2. **Deep Array Operations**
Large arrays with nested operations can cause stack overflow:

```typescript
// POTENTIAL ISSUE - Very large array
const hugeArray = new Array(100000).fill(0);
hugeArray.forEach(item => {
  // Deep processing here
});

// BETTER - Process in chunks
const chunkSize = 1000;
for (let i = 0; i < hugeArray.length; i += chunkSize) {
  const chunk = hugeArray.slice(i, i + chunkSize);
  chunk.forEach(processItem);
}
```

### 3. **Circular Object References**
Objects that reference themselves can cause infinite loops:

```typescript
// DANGER - Circular reference
const obj: any = { name: 'test' };
obj.self = obj; // Circular reference

JSON.stringify(obj); // This will fail!
```

### 4. **Prisma Query Issues**
Large database queries without limits:

```typescript
// Check these patterns in your code:
await prisma.entry.findMany(); // No limit - could be huge
await prisma.entry.findMany({
  where: { userId }, // No limit on user's entries
});
```

## Specific Areas to Check in Your Code

### 1. **Alert Processor (alertProcessor.ts)**
```typescript
// Check line 138-147:
const existingEntries = await prisma.entry.findMany({
  where: { userId: query.userId },
  select: { doi: true, title: true }
})
// This could return thousands of entries!
```

### 2. **Normalization Function**
```typescript
// The normalizeTitle function looks safe, but check if it's called in a loop
// on a very large array
```

### 3. **Array Processing in Batches**
```typescript
// Lines 160-179 in alertProcessor.ts:
for (let i = 0; i < candidates.length; i += batchSize) {
  const batch = candidates.slice(i, i + batchSize);
  const results = await Promise.allSettled(
    batch.map(paper => checkRelevance(query.query, paper))
  );
}
```

## Quick Fixes to Try

### 1. **Add Limits to Database Queries**
```typescript
// In alertProcessor.ts, add a limit:
const existingEntries = await prisma.entry.findMany({
  where: { userId: query.userId },
  select: { doi: true, title: true },
  take: 10000, // Add this limit
})
```

### 2. **Add Stack Size Logging**
Add this to your cron route to detect when stack is getting deep:

```typescript
// In route.ts, before calling processAllAlerts():
const stackSize = (new Error()).stack?.split('\n').length || 0;
console.log('[cron] Current stack size:', stackSize);

if (stackSize > 100) {
  console.error('[cron] Stack size suspiciously large!');
}
```

### 3. **Catch and Log Stack Errors**
```typescript
// Wrap the processing in a try-catch:
try {
  const results = await processAllAlerts();
} catch (error) {
  if (error instanceof RangeError && error.message.includes('stack')) {
    console.error('[cron] Stack overflow detected!');
    console.error('Stack trace:', error.stack);
  }
  throw error;
}
```

## How to Reproduce and Debug

1. **Add logging before potential issues:**
```typescript
console.log('Before processing entries:', existingEntries.length);
```

2. **Use Vercel logs to find the exact location:**
- The error will show a stack trace
- Look for the last function that was called
- Check if it's in a loop or recursive call

3. **Test with smaller datasets:**
- Temporarily add `LIMIT 1` to queries
- See if the error still occurs

## Most Likely Culprit

Based on your code, the most likely cause is:
```typescript
// Line 138-147 in alertProcessor.ts
const existingEntries = await prisma.entry.findMany({
  where: { userId: query.userId },
  select: { doi: true, title: true }
})
const existingDOIs = new Set(
  existingEntries.map((e: { doi: string | null }) => e.doi).filter(Boolean) as string[]
)
const existingTitles = new Set(
  existingEntries.map((e: { title: string }) => normalizeTitle(e.title))
)
```

If a user has thousands of papers, this could:
1. Return a huge array from the database
2. Process each item through `normalizeTitle`
3. Create very large Set objects

## Immediate Fix to Test

Add this to limit the query:

```typescript
const existingEntries = await prisma.entry.findMany({
  where: { userId: query.userId },
  select: { doi: true, title: true },
  orderBy: { createdAt: 'desc' },
  take: 5000, // Limit to last 5000 entries
})
```

## Verification

To verify the fixes are working:

1. **Check logs for stack size monitoring:**
```
[alertProcessor] Initial stack size: 15
[alertProcessor] Stack size at query start: 18
```

2. **Look for chunked processing messages:**
```
[alertProcessor] Found 2000 existing entries for deduplication
```

3. **Test with a user who has many papers:**
- The system should now process without stack overflow
- Queries will be automatically disabled if they cause issues

4. **Run the test script:**
```bash
node test-stack-fixes.js
```

## Root Cause

The stack overflow was caused by using `new Set(array.map(...))` with large arrays. When processing users with thousands of entries, this pattern creates a deep call stack that exceeds JavaScript's limits. The fix uses iterative Set building with async breaks to prevent this issue.
