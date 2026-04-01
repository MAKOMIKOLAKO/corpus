# Alert API Routes Documentation

## Overview

The alert system provides smart paper recommendations based on user-defined research queries. It consists of several API routes for managing alert containers, entries, and automated processing.

## API Routes

### 1. Alert Container Management

#### GET /api/alert-containers
Lists all alert containers for the authenticated user.

**Authentication:** Required (user session)

**Response:**
```json
[
  {
    "id": "container_id",
    "query": "machine learning in healthcare",
    "collectionId": "collection_id",
    "watchQueryId": "watch_query_id",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "watchQuery": {
      "id": "query_id",
      "query": "machine learning in healthcare",
      "isActive": true,
      "maxPapers": 5
    },
    "counts": {
      "pending": 3,
      "approved": 2,
      "rejected": 1
    }
  }
]
```

#### GET /api/alert-containers/[id]
Retrieves a specific alert container with all its entries.

**Authentication:** Required (user session)

**Response:**
```json
{
  "id": "container_id",
  "query": "machine learning in healthcare",
  "collectionId": "collection_id",
  "watchQueryId": "watch_query_id",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "watchQuery": { ... },
  "counts": { ... },
  "entries": [
    {
      "id": "entry_id",
      "externalId": "doi_or_s2_id",
      "title": "Paper Title",
      "authors": ["Author 1", "Author 2"],
      "year": 2024,
      "abstract": "Paper abstract...",
      "url": "https://doi.org/...",
      "metadata": {
        "doi": "10.1000/...",
        "venue": "Conference Name",
        "openAccessUrl": "https://...",
        "semanticScholarId": "S2_id"
      },
      "status": "PENDING",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### DELETE /api/alert-containers/[id]
Deletes a specific alert container and all its entries.

**Authentication:** Required (user session)

**Response:**
```json
{
  "success": true
}
```

### 2. Alert Entry Actions

#### PATCH /api/alert-containers/[id]/entries/[entryId]
Approves or rejects a single alert entry.

**Authentication:** Required (user session)

**Request Body:**
```json
{
  "action": "approve" // or "reject"
}
```

**Response (approve):**
```json
{
  "success": true,
  "result": {
    "status": "APPROVED",
    "entryId": "created_entry_id",
    "createdNew": true
  },
  "containerDeleted": false,
  "pendingCount": 2
}
```

**Response (reject):**
```json
{
  "success": true,
  "result": {
    "status": "REJECTED"
  },
  "containerDeleted": false,
  "pendingCount": 2
}
```

#### PATCH /api/alert-containers/[id]/bulk
Bulk approves or rejects all pending entries in a container.

**Authentication:** Required (user session)

**Request Body:**
```json
{
  "action": "approve_all" // or "reject_all"
}
```

**Response:**
```json
{
  "success": true,
  "processed": 3,
  "failed": 0,
  "action": "approve_all",
  "pendingCount": 0,
  "containerDeleted": true
}
```

### 3. Alert Processing

#### POST /api/cron/smart-alerts
Triggers the alert processing cron job. This route fetches new papers, filters them for relevance, and creates alert entries.

**Authentication:** Required (CRON_SECRET)

**Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "processed": 5,
  "papersAdded": 12,
  "errors": 0
}
```

#### GET /api/cron/smart-alerts
Manual trigger for testing (development only).

**Authentication:** Required (admin session in development, blocked in production)

**Response:** Same as POST route

## Environment Variables

### Required for Alert Functionality

1. **CRON_SECRET**
   - Purpose: Authenticates cron job requests
   - Format: Random string (minimum 32 characters recommended)
   - Example: `F=|+OH&(?Jt#{p=]>w?Bq8Vd_!^Q%y1^`

2. **SEMANTIC_SCHOLAR_API_KEY**
   - Purpose: Fetching candidate papers from Semantic Scholar API
   - Get from: https://www.semanticscholar.org/product/api
   - Required for: Paper discovery

3. **GOOGLE_AI_API_KEY** or **GEMINI_API_KEY**
   - Purpose: Relevance filtering using Gemini AI
   - Get from: https://makersuite.google.com/app/apikey
   - Required for: Paper relevance classification

4. **DATABASE_URL**
   - Purpose: PostgreSQL database connection
   - Required for: Storing alerts, containers, and entries

5. **NEXTAUTH_SECRET**
   - Purpose: Session authentication
   - Required for: User authentication

### Optional but Related

- **ADMIN_EMAIL**
  - Purpose: Allows manual cron trigger in development
  - Required for: GET /api/cron/smart-alerts in development

## Database Schema

### AlertContainer
```sql
- id: String (primary key)
- userId: String (foreign key)
- watchQueryId: String (foreign key)
- query: String
- collectionId: String? (foreign key, optional)
- createdAt: DateTime
- updatedAt: DateTime
```

### AlertEntry
```sql
- id: String (primary key)
- containerId: String (foreign key)
- externalId: String (DOI or Semantic Scholar ID)
- title: String
- authors: String[]
- year: Int?
- abstract: String?
- url: String?
- metadata: Json?
- status: AlertEntryStatus (PENDING | APPROVED | REJECTED)
- createdAt: DateTime
- updatedAt: DateTime
```

## Cron Configuration

The system uses Vercel Cron Jobs to schedule alert processing:

```json
{
  "crons": [
    {
      "path": "/api/cron/smart-alerts",
      "schedule": "0 8 * * *"
    }
  ]
}
```

This runs daily at 8:00 AM UTC.

## Rate Limits and Cost Control

- Maximum 200 papers per cron run
- Maximum 10 papers per query per run
- 2-second delay between queries to respect API limits
- Batch processing of 5 papers for relevance checking

## Security Considerations

1. All user-facing routes require authentication
2. Users can only access their own alert containers
3. Cron endpoint uses Bearer token authentication
4. API keys are never exposed in responses
5. Prisma queries use proper user filtering

## Error Handling

- 401: Unauthorized (missing or invalid authentication)
- 404: Not found (invalid container or entry ID)
- 400: Bad request (invalid action or parameters)
- 500: Internal server error (database or API failures)

## Testing

Use the provided test script to verify all routes:

```bash
# Set environment variables
export BASE_URL=http://localhost:3000
export SESSION_TOKEN=your_session_token
export CRON_SECRET=your_cron_secret

# Run tests
node test-alert-routes.js
```

## Troubleshooting

### Common Issues

1. **"Unauthorized" errors**
   - Check that CRON_SECRET matches between environment and requests
   - Verify user session is valid

2. **"SEMANTIC_SCHOLAR_API_KEY is required"**
   - Ensure the API key is set and not empty
   - Check for extra spaces in the environment variable

3. **"GEMINI_API_KEY is required"**
   - Set either GOOGLE_AI_API_KEY or GEMINI_API_KEY
   - Verify the key has Gemini API access

4. **No alerts being created**
   - Check if user plan is PRO (FREE plans don't get alerts)
   - Verify watch queries are active
   - Check lastCheckedAt timestamp on queries

5. **Container auto-deletion not working**
   - Ensure all entries are processed (no PENDING status)
   - Check the pendingCount returned by bulk operations
