# Entry Submission Queue System

## Overview

The Entry Submission Queue System allows users to add multiple entries consecutively without waiting for each request to complete. Each user's submissions are processed in order, one at a time, preventing race conditions and duplicate entries while keeping the UI responsive.

## Architecture

### Frontend Components

#### 1. `useEntryQueue` Hook (`src/hooks/useEntryQueue.ts`)

**Purpose**: Manages the per-user entry submission queue with automatic processing.

**Key Features**:
- Maintains a local queue array per user session
- Automatically processes items sequentially (one at a time)
- Tracks status for each queued item: `pending`, `processing`, `success`, `failed`
- Provides retry and cancellation capabilities
- Auto-starts processing when items are added

**API**:
```typescript
const {
  queue,           // Array of QueueItem objects
  isProcessing,    // Boolean indicating if queue is being processed
  addToQueue,      // (url, metadata) => itemId
  removeFromQueue, // (itemId) => void (only pending items)
  clearCompleted,  // () => void
  clearAll,        // () => void
  retryItem,       // (itemId) => void
  stats            // { total, pending, processing, success, failed }
} = useEntryQueue({ apiKey, onSuccess, onError, onQueueComplete });
```

**Queue Processing Logic**:
1. Items are added with `pending` status
2. Queue automatically starts processing if not already running
3. Next pending item is marked as `processing`
4. API request is made to `/api/entries`
5. Item status updates to `success` or `failed` based on response
6. Process repeats for next pending item
7. Queue stops when no pending items remain

#### 2. `QueuedEntriesDisplay` Component (`src/components/QueuedEntriesDisplay.tsx`)

**Purpose**: Visual feedback for queued entries and their statuses.

**Features**:
- Real-time status updates with icons (clock, spinner, checkmark, error)
- Color-coded status indicators
- Action buttons: View (success), Retry (failed), Cancel (pending)
- Bulk actions: Clear Completed, Clear All
- Statistics badges showing counts by status
- Scrollable list with max height for many items

#### 3. `AddEntryForm` Component (Updated)

**New Features**:
- **Queue Mode Toggle**: Checkbox to enable/disable queue mode
- **Dual Behavior**:
  - **Normal Mode**: Save immediately and navigate to entry (original behavior)
  - **Queue Mode**: Add to queue and reset form for next entry
- **Queue Display**: Shows `QueuedEntriesDisplay` when queue has items
- **Form Reset**: Automatically clears form after adding to queue for rapid consecutive entries

### Backend Safety

#### Concurrent Request Handling

The backend is designed to safely handle concurrent requests through multiple layers:

1. **Database Constraints** (`prisma/schema.prisma`):
   - `url` field has `@unique` constraint (line 150)
   - `doi` field has `@unique` constraint (line 151)
   - Database-level prevention of duplicate entries

2. **Duplicate Detection** (`src/lib/duplicateHandler.ts`):
   - Pre-insert duplicate checking via `checkForDuplicates()`
   - Checks URL, DOI, and title similarity
   - Returns confidence levels: `high`, `medium`, `low`
   - Prevents duplicates before database insertion

3. **Rate Limiting** (`src/app/api/entries/route.ts`):
   - Applied to write operations (line 124)
   - Prevents abuse and excessive concurrent requests

4. **Atomic Operations**:
   - Prisma's `create()` operation is atomic
   - Transaction-safe at database level
   - No race conditions between duplicate check and insert

## Usage Guide

### For Users

#### Enabling Queue Mode

1. Navigate to the Add Entry page (`/add`)
2. Check the "Queue mode (add multiple entries)" checkbox at the bottom of the form
3. Fill in entry details and press Enter or click "Add to Queue"
4. Form automatically clears for the next entry
5. Watch the queue display above the form for progress

#### Managing the Queue

- **View Progress**: Queue display shows all items with real-time status updates
- **Cancel Pending**: Click the X button on pending items to remove them
- **Retry Failed**: Click the retry button on failed items to reprocess them
- **View Success**: Click "View" on successful items to navigate to the entry
- **Clear Completed**: Remove all successful/failed items from the display
- **Clear All**: Remove all items and stop processing

#### Keyboard Shortcuts

- **Enter**: Submit form (add to queue in queue mode, save in normal mode)
- **Tab**: Navigate between form fields

### For Developers

#### Adding Queue Support to Other Forms

```typescript
import { useEntryQueue } from '@/hooks/useEntryQueue';
import QueuedEntriesDisplay from '@/components/QueuedEntriesDisplay';

function MyForm() {
  const apiKey = useApiKey();
  
  const entryQueue = useEntryQueue({
    apiKey,
    onSuccess: (item, entryId) => {
      // Handle successful entry creation
      console.log(`Entry created: ${entryId}`);
    },
    onError: (item, error) => {
      // Handle failed entry creation
      console.error(`Failed: ${error}`);
    },
    onQueueComplete: () => {
      // Optional: Handle when all items are processed
      console.log('Queue complete');
    }
  });

  const handleSubmit = () => {
    entryQueue.addToQueue(url, metadata);
  };

  return (
    <>
      <QueuedEntriesDisplay
        queue={entryQueue.queue}
        stats={entryQueue.stats}
        onRemove={entryQueue.removeFromQueue}
        onRetry={entryQueue.retryItem}
        onClearCompleted={entryQueue.clearCompleted}
        onClearAll={entryQueue.clearAll}
      />
      {/* Your form here */}
    </>
  );
}
```

#### Customizing Queue Behavior

**Custom Success Handler**:
```typescript
const entryQueue = useEntryQueue({
  apiKey,
  onSuccess: (item, entryId) => {
    // Custom logic, e.g., show toast notification
    toast.success(`Added: ${item.metadata.title}`);
    // Navigate to entry
    router.push(`/entries/${entryId}`);
  }
});
```

**Custom Error Handler**:
```typescript
const entryQueue = useEntryQueue({
  apiKey,
  onError: (item, error) => {
    // Custom error handling
    if (error.includes('duplicate')) {
      toast.warning(`Duplicate: ${item.metadata.title}`);
    } else {
      toast.error(`Failed: ${error}`);
    }
  }
});
```

## Edge Cases & Error Handling

### 1. User Navigates Away

**Behavior**: Queue is cleared when component unmounts
**Reason**: Queue is session-based, not persisted
**Future Enhancement**: Could add localStorage persistence

### 2. Network Failure

**Behavior**: Item marked as `failed` with error message
**Recovery**: User can retry the failed item manually
**UI Feedback**: Red error icon with retry button

### 3. Duplicate Entry

**Behavior**: Backend returns 409 status, item marked as `failed`
**Error Message**: Includes duplicate entry details and confidence level
**UI Feedback**: Failed status with descriptive error message

### 4. Entry Limit Reached

**Behavior**: Backend returns 403 status, item marked as `failed`
**Error Message**: "entry_limit_reached"
**UI Feedback**: Failed status, upgrade banner shown

### 5. API Key Invalid

**Behavior**: Request fails immediately, item marked as `failed`
**Error Message**: "Unauthorized"
**Recovery**: User must refresh API key

### 6. Concurrent Duplicate Submissions

**Scenario**: User adds same entry twice in queue before first processes
**Protection**: 
- First item processes successfully
- Second item fails duplicate check at backend
- Database unique constraints provide final safety net

### 7. Queue Processing Interruption

**Scenario**: Browser refresh or tab close during processing
**Behavior**: Queue is lost (not persisted)
**Mitigation**: Items already successfully created remain in database

## Performance Considerations

### Sequential Processing

**Why Sequential?**
- Prevents overwhelming the backend with concurrent requests
- Ensures predictable order of entry creation
- Simplifies error handling and retry logic
- Respects rate limiting

**Processing Speed**:
- ~100ms delay between items (configurable in `processNextItem`)
- Actual speed depends on backend response time
- AI generation (keywords/topics) adds 2-5 seconds per entry

### Optimization Tips

1. **Skip AI for Bulk Imports**: Set `skipAI: true` in metadata to skip keyword/topic generation
2. **Batch Similar Entries**: Group entries by type for faster processing
3. **Pre-fetch Metadata**: Use DOI/URL fetch before queuing for better accuracy

## Future Enhancements

### Potential Improvements

1. **Persistence**: Save queue to localStorage for recovery after refresh
2. **Parallel Processing**: Process multiple items concurrently (with rate limiting)
3. **Progress Indicators**: Show percentage complete and estimated time
4. **Bulk Import**: CSV/JSON file upload with automatic queuing
5. **Undo**: Allow undoing recently added entries
6. **Queue Reordering**: Drag-and-drop to change processing order
7. **Auto-retry**: Automatically retry failed items with exponential backoff
8. **Notifications**: Browser notifications when queue completes
9. **Queue Statistics**: Track success rate, average processing time
10. **Export Queue**: Save queue as JSON for later import

## Testing

### Manual Testing Checklist

- [ ] Add single entry in queue mode
- [ ] Add multiple entries rapidly (5+)
- [ ] Cancel a pending item
- [ ] Retry a failed item
- [ ] Clear completed items
- [ ] Clear all items
- [ ] Toggle queue mode on/off
- [ ] Submit duplicate entry
- [ ] Submit with network offline
- [ ] Navigate away during processing
- [ ] Refresh page during processing
- [ ] Test with entry limit reached
- [ ] Test with invalid API key

### Automated Testing (Future)

```typescript
// Example test structure
describe('useEntryQueue', () => {
  it('should add items to queue', () => {});
  it('should process items sequentially', () => {});
  it('should handle failures gracefully', () => {});
  it('should allow retry of failed items', () => {});
  it('should prevent removal of processing items', () => {});
});
```

## Troubleshooting

### Queue Not Processing

**Symptoms**: Items stuck in "pending" status
**Causes**:
- API key missing or invalid
- Network connectivity issues
- Backend server down

**Solutions**:
1. Check browser console for errors
2. Verify API key in settings
3. Check network tab for failed requests
4. Retry failed items manually

### Duplicate Entries Created

**Symptoms**: Same entry appears multiple times in library
**Causes**:
- User bypassed queue mode
- Database constraints not applied
- Duplicate check logic failed

**Solutions**:
1. Manually delete duplicates
2. Report bug with entry details
3. Use queue mode to prevent future duplicates

### Queue Display Not Updating

**Symptoms**: Status not changing in UI
**Causes**:
- React state not updating
- Component not re-rendering

**Solutions**:
1. Refresh the page
2. Clear browser cache
3. Check browser console for errors

## API Reference

### QueueItem Interface

```typescript
interface QueueItem {
  id: string;                    // Unique identifier
  url: string;                   // Entry URL
  metadata: {                    // Entry metadata
    title: string;
    authors: string[];
    year?: number;
    publishDate?: string;
    contentType: string;
    url: string;
    doi: string;
    source: string;
    abstract: string;
  };
  status: QueueItemStatus;       // 'pending' | 'processing' | 'success' | 'failed'
  error?: string;                // Error message if failed
  entryId?: string;              // Created entry ID if successful
  timestamp: number;             // Creation timestamp
}
```

### Hook Options

```typescript
interface UseEntryQueueOptions {
  apiKey: string;                                    // Required: User API key
  onSuccess?: (item: QueueItem, entryId: string) => void;  // Optional: Success callback
  onError?: (item: QueueItem, error: string) => void;      // Optional: Error callback
  onQueueComplete?: () => void;                      // Optional: Queue complete callback
}
```

## Contributing

When modifying the queue system:

1. Maintain backward compatibility with existing forms
2. Add tests for new features
3. Update this documentation
4. Consider performance implications
5. Handle edge cases gracefully
6. Provide clear error messages
7. Follow existing code style

## License

Part of the Corpus Knowledge Indexer application.
