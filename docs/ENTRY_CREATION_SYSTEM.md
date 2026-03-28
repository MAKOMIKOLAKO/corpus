# Queue-Based Entry Creation System

This document describes the refactored entry creation system that implements a queue-based, multi-input metadata extraction pipeline with LLM-first processing, book search, and Semantic Scholar search.

## Overview

The new system allows users to create entries through three different input modes:
1. **Paste Link** - Extract metadata from any web page using AI
2. **Book Title** - Search Open Library for book information
3. **Paper Title** - Search Semantic Scholar for research papers

All submissions are processed asynchronously through a per-user queue system, allowing users to submit multiple inputs without waiting for previous submissions to complete.

## Architecture

### Backend Components

#### 1. Queue System (`src/lib/entryQueue.ts`)
- Per-user in-memory queue management
- Asynchronous processing of submissions
- Automatic cleanup of old completed entries
- Singleton pattern for global access

#### 2. Metadata Extraction (`src/lib/metadataExtraction.ts`)
- `extractMetadataFromLink()` - LLM-based extraction for URLs
- `fetchBookByTitle()` - Open Library API integration
- `fetchPaperByTitle()` - Semantic Scholar API integration
- `summarizeWithLLM()` - AI-powered summarization
- `cleanAndNormalizeMetadata()` - Data cleaning and normalization

#### 3. API Endpoints
- `POST /api/entry/create` - Submit new entry to queue
- `GET /api/entry/create` - Get queue status
- `POST /api/ai/extract-metadata` - LLM metadata extraction
- `POST /api/ai/summarize` - AI summarization

### Frontend Components

#### 1. EntryInput (`src/components/EntryInput.tsx`)
- Toggle buttons for input modes
- Dynamic placeholders based on selected mode
- Enter key submission support
- Disabled state during processing

#### 2. EntryPreview (`src/components/EntryPreview.tsx`)
- Display extracted metadata
- Editable fields for all metadata
- Save/Cancel actions
- Loading states

#### 3. EntryCreationManager (`src/components/EntryCreationManager.tsx`)
- Orchestrates the entire flow
- Queue status display
- Error handling
- Recently added entries list

#### 4. useEntryCreation Hook (`src/hooks/useEntryCreation.ts`)
- Queue polling and state management
- Entry submission
- Error handling
- Auto-polling based on queue state

## Workflow

1. **User Input**
   - Selects input mode (Link/Book/Paper)
   - Enters URL or search query
   - Presses Enter or clicks Add

2. **Queue Processing**
   - Submission added to user's queue
   - Returns immediate response with queue position
   - Background processing begins

3. **Metadata Extraction**
   - **Link Mode**: Fetch page content → LLM extraction
   - **Book Mode**: Open Library search → Optional LLM summary
   - **Paper Mode**: Semantic Scholar search → LLM summary from abstract

4. **Database Storage**
   - Deduplication check (URL or normalized title)
   - Entry creation with validated schema
   - Queue status updated to completed

5. **Frontend Update**
   - Polling detects completed entries
   - Entry preview displayed
   - User can edit before final save

## API Integration Details

### Open Library API
- Endpoint: `https://openlibrary.org/search.json`
- No API key required
- Returns: title, authors, publish year, ISBN, cover URLs
- Additional fetch for work details including description

### Semantic Scholar API
- Endpoint: `https://api.semanticscholar.org/graph/v1/paper/search`
- API key required (rate limited without)
- Returns: title, authors, year, abstract, venue, DOI
- LLM used to generate 2-sentence summary from abstract

### Google AI API
- Model: `gemini-pro`
- Used for:
  - Metadata extraction from web content
  - Summary generation
- Token optimization:
  - Limited text input (10k chars for pages)
  - Minimal prompts
  - Low temperature for consistency

## Error Handling

1. **Network Errors** - Retry with exponential backoff
2. **API Failures** - Graceful degradation with fallbacks
3. **Invalid Input** - Client-side validation with clear messages
4. **Duplicate Entries** - 409 status with existing entry details
5. **LLM Errors** - Fallback to basic metadata extraction

## Performance Considerations

1. **Queue Throttling** - One item at a time per user
2. **Text Limits** - 10k character limit for page content
3. **Polling Interval** - 2 seconds for queue updates
4. **Cleanup** - Auto-remove completed entries after 24 hours
5. **Caching** - Consider Redis for multi-instance deployments

## Environment Variables

See `.env.example` for required environment variables:

```bash
# Required for LLM features
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Required for paper search
SEMANTIC_SCHOLAR_API_KEY=your-semantic-scholar-key

# Open Library doesn't require an API key
```

## Usage Example

```tsx
import { EntryCreationManager } from '@/components/EntryCreationManager';

export default function AddEntriesPage() {
  return (
    <div className="container mx-auto py-8">
      <EntryCreationManager />
    </div>
  );
}
```

## Future Enhancements

1. **Persistent Queue** - Redis or database-backed queue
2. **Bulk Import** - CSV/JSON file upload
3. **Browser Extension** - Quick save from any page
4. **Webhook Support** - Notifications for completed entries
5. **Advanced Search** - Filters and sorting in queue
6. **Batch Operations** - Process multiple items together

## Troubleshooting

### Common Issues

1. **Queue not processing**
   - Check environment variables
   - Verify API keys are valid
   - Check browser console for errors

2. **Duplicate detection not working**
   - Ensure proper database indexes
   - Check normalization logic in `cleanAndNormalizeMetadata`

3. **LLM extraction failing**
   - Verify Google AI API key and access
   - Check token usage limits
   - Review prompt engineering

4. **Semantic Scholar rate limits**
   - Add API key to increase limits
   - Implement request throttling
   - Add retry logic with delays
