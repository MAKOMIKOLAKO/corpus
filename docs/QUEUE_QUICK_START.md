# Entry Queue System - Quick Start Guide

## For Users

### How to Use Queue Mode

1. **Navigate to Add Entry page** (`/add`)
2. **Enable Queue Mode**: Check the "Queue mode (add multiple entries)" checkbox
3. **Add Entries**:
   - Fill in the title (required) and other details
   - Press Enter or click "Add to Queue"
   - Form clears automatically for the next entry
4. **Monitor Progress**: Watch the queue display above the form
5. **Manage Queue**:
   - ✅ **Success**: Click "View" to see the entry
   - ❌ **Failed**: Click retry icon to try again
   - ⏱️ **Pending**: Click X to cancel
   - 🗑️ **Clear Completed**: Remove finished items
   - 🗑️ **Clear All**: Remove everything

### Benefits

- **No Waiting**: Add entries rapidly without waiting for each to complete
- **Visual Feedback**: See real-time status of all queued entries
- **Error Recovery**: Retry failed entries with one click
- **Organized**: Entries process in order, one at a time

### Tips

- Use queue mode when adding 3+ entries at once
- Pre-fetch metadata with DOI/URL before queuing for best results
- Failed entries can be retried after fixing issues
- Queue clears when you navigate away (by design)

## For Developers

### Quick Integration

```typescript
import { useEntryQueue } from '@/hooks/useEntryQueue';
import QueuedEntriesDisplay from '@/components/QueuedEntriesDisplay';

function MyComponent() {
  const apiKey = useApiKey();
  const queue = useEntryQueue({ apiKey });
  
  // Add to queue
  queue.addToQueue(url, metadata);
  
  // Display queue
  return <QueuedEntriesDisplay {...queue} />;
}
```

### Key Files

- **Hook**: `src/hooks/useEntryQueue.ts`
- **Display**: `src/components/QueuedEntriesDisplay.tsx`
- **Example**: `src/components/AddEntryForm.tsx`
- **Docs**: `docs/QUEUE_SYSTEM.md`

### Queue Flow

```
User adds entry → Queue (pending) → Processing → API Call → Success/Failed
                                                              ↓
                                                         Update Status
```

### Status States

- `pending`: Waiting to be processed
- `processing`: Currently being sent to API
- `success`: Entry created successfully
- `failed`: Error occurred (can retry)

## Common Scenarios

### Scenario 1: Bulk Import Papers

1. Enable queue mode
2. For each paper:
   - Paste DOI
   - Click "Fetch"
   - Review metadata
   - Click "Add to Queue"
3. Monitor queue as entries are created

### Scenario 2: Quick Entry Addition

1. Enable queue mode
2. Type title and essential details
3. Press Enter
4. Repeat for next entry
5. Queue processes in background

### Scenario 3: Handling Failures

1. Check failed entry error message
2. Click retry icon if temporary issue
3. Or fix the issue and re-add manually
4. Clear failed items when done

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Queue not processing | Check API key, network connection |
| Duplicate errors | Entry already exists, view existing entry |
| Items stuck pending | Refresh page, check console for errors |
| Queue disappeared | Queue is session-based, not persisted |

## Full Documentation

See `docs/QUEUE_SYSTEM.md` for complete documentation including:
- Architecture details
- API reference
- Edge cases
- Performance considerations
- Future enhancements
