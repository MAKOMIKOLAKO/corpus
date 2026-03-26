# Admin Dashboard

A private analytics dashboard for monitoring key metrics in your Corpus application.

## Features

- 🔐 **Secure Authentication**: Basic auth with environment variables
- 📊 **Real-time Metrics**: User onboarding, entry actions, collections, and engagement
- 📈 **Interactive Charts**: Visual representations using Recharts
- 📅 **Date Filtering**: Filter metrics by date range
- 📄 **CSV Export**: Export metrics data for further analysis
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Setup

### 1. Environment Variables

Add these to your `.env` file:

```env
# Admin Dashboard Credentials
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password_here
```

### 2. Database Schema

The dashboard queries the `AnalyticsEvent` table. Ensure you have the following events tracked:

- `USER_SIGNED_UP` - User registration
- `USERNAME_SET` - Username setup completion
- `EMAIL_VERIFIED` - Email verification
- `ENTRY_SAVED` - Entry creation
- `READING_STATUS_UPDATED` - Reading status changes
- `COLLECTION_CREATED` - Collection creation
- `COLLECTION_SHARED` - Collection sharing
- `COLLECTION_SHARE_ACCEPTED` - Share acceptance
- `FEED_CARD_VIEWED` - Feed interactions
- `ADD_TO_LIBRARY_CLICKED` - Library additions

## Access

1. Navigate to `/admin` in your application
2. Enter your admin credentials
3. View the dashboard at `/admin/dashboard`

## Metrics Explained

### User Onboarding
- **Total Signups**: Number of user registrations
- **Username Setups**: Users who completed username setup
- **Email Verifications**: Verified email addresses

### Entry Actions
- **Total Entries**: All entries saved in the system
- **Avg Entries Per User**: Mean entries per active user
- **Reading Status Distribution**: Breakdown of read/unread/reading

### Collections
- **Created**: Total collections created
- **Shared**: Collections shared with others
- **Shares Accepted**: Accepted collection shares
- **Avg Entries Per Collection**: Mean entries per collection

### Engagement
- **Feed Views**: Total feed card impressions
- **Library Clicks**: Add-to-library interactions
- **Multi-save Users**: Users with >1 entry saved
- **Multi-save %**: Percentage of multi-save users

## API Endpoint

### GET `/api/admin/metrics`

Protected endpoint that returns aggregated metrics.

**Authentication**: Basic Auth (username:password)

**Query Parameters**:
- `startDate` (optional): Filter from this date (YYYY-MM-DD)
- `endDate` (optional): Filter to this date (YYYY-MM-DD)

**Response**:
```json
{
  "userOnboarding": {
    "totalSignups": number,
    "signupsPerDay": Array<{date: Date, count: number}>,
    "usernameSetups": number,
    "emailVerifications": number
  },
  "entryActions": {
    "totalEntries": number,
    "avgEntriesPerUser": number,
    "readingStatusDistribution": Array<{status: string, count: number}>,
    "topUsers": Array<{email: string, entryCount: number}>
  },
  "collections": {
    "collectionsCreated": number,
    "sharedCollections": number,
    "collectionSharesAccepted": number,
    "avgEntriesPerCollection": number
  },
  "engagement": {
    "feedCardViews": number,
    "addToLibraryClicks": number,
    "multipleSavesUsers": number,
    "multipleSavePercentage": number
  }
}
```

## Security Considerations

- Credentials are stored in environment variables
- Session-based authentication (stored in sessionStorage)
- No sensitive data (passwords, tokens) is logged
- API routes are protected with authentication middleware

## Extending the Dashboard

### Adding New Metrics

1. Track the event in your application code
2. Add the metric to the API route in `/api/admin/metrics/route.ts`
3. Display the metric in the dashboard component

### Adding New Charts

The `MetricsChart` component supports three chart types:
- `line`: For time-series data
- `pie`: For distribution data
- `bar`: For categorical data

Example usage:
```tsx
<MetricsChart
  type="line"
  title="Your Metric"
  data={yourData}
  xAxisKey="date"
  yAxisKey="value"
/>
```

## Performance Notes

- Queries are optimized with proper database indexes
- Date filtering improves performance for large datasets
- Consider implementing caching for frequently accessed metrics
- Dashboard data refreshes on each page load or filter change

## Troubleshooting

### "Admin credentials not configured"
Ensure `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set in your environment variables.

### "Failed to fetch metrics"
Check your database connection and ensure the `AnalyticsEvent` table exists.

### Charts not displaying
Verify the data structure matches the expected format for each chart type.
