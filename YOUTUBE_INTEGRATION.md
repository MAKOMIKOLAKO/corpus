# YouTube Integration for Knowledge Indexer

This document describes the YouTube processing pipeline that has been added to the knowledge indexer application.

## Overview

The YouTube integration allows users to automatically extract metadata from YouTube videos and add them to their knowledge corpus. The system uses the YouTube Data API v3 to fetch comprehensive video information.

## Features

### Automatic URL Detection
- Automatically detects YouTube URLs and routes them to the specialized YouTube processor
- Supports various YouTube URL formats:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
  - `https://www.youtube.com/shorts/VIDEO_ID`

### Metadata Extraction
Using the YouTube Data API v3, the system extracts:

#### Basic Metadata
- **Title**: Video title
- **Channel**: Channel name as author
- **Publication Date**: When the video was published
- **Description**: Full video description
- **Duration**: Video length in ISO 8601 format
- **Statistics**: View count, like count, comment count
- **Thumbnails**: High-quality thumbnail URLs
- **Tags**: Creator-provided video tags

#### AI-Enhanced Metadata
When AI processing is enabled:
- **Smart Summary**: AI-generated abstract based on title, description, and tags
- **Keyword Extraction**: 5-8 relevant keywords extracted from video content
- **Content Classification**: Automatic categorization as "VIDEO" content type

## API Endpoints

### `/api/fetch-youtube` (POST)
Specialized endpoint for YouTube video metadata extraction.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "useAI": true
}
```

**Response:**
```json
{
  "title": "Never Gonna Give You Up",
  "authors": ["Rick Astley"],
  "year": 2009,
  "source": "YouTube",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "contentType": "VIDEO",
  "abstract": "Rick Astley's official music video for 'Never Gonna Give You Up'...",
  "autoKeywords": ["music", "pop", "80s", "rick astley", "classic"],
  "userKeywords": [],
  "videoId": "dQw4w9WgXcQ",
  "channelTitle": "Rick Astley",
  "publishedAt": "2009-10-25T06:57:33Z",
  "duration": "PT3M33S",
  "viewCount": 1500000000,
  "likeCount": 11000000,
  "commentCount": 850000,
  "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  "tags": ["rick astley", "never gonna give you up", "official video"]
}
```

### `/api/fetch-url` (POST) - Enhanced
The existing URL fetch endpoint now automatically detects YouTube URLs and redirects them to the YouTube processor.

## Setup

### 1. Get YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Copy the API key

### 2. Configure Environment
Add your YouTube API key to the `.env` file:

```env
YOUTUBE_API_KEY="your_youtube_api_key_here"
```

### 3. Install Dependencies
The YouTube integration requires the `googleapis` package:

```bash
npm install googleapis
```

## Usage

### Automatic Integration
When users paste a YouTube URL into the existing "Add Entry" form, the system will:
1. Automatically detect it as a YouTube URL
2. Route it to the YouTube processor
3. Extract rich metadata using the YouTube API
4. Optionally enhance with AI-generated summaries and keywords

### Component Usage
Use the `QuickAddYouTubeEntry` component for a dedicated YouTube entry form:

```tsx
import QuickAddYouTubeEntry from '@/components/QuickAddYouTubeEntry';

<QuickAddYouTubeEntry onEntryAdded={(entry) => {
  console.log('YouTube entry added:', entry);
}} />
```

## Data Model Extensions

The YouTube integration adds the following fields to entry data:

```typescript
interface YouTubeEntry extends Entry {
  videoId: string;
  channelTitle: string;
  publishedAt: string | null;
  duration: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string | null;
  tags: string[];
}
```

## Error Handling

### Fallback Behavior
- If YouTube API key is not configured, falls back to basic extraction
- If API calls fail, provides minimal metadata with video ID
- Graceful degradation ensures the form never crashes

### Rate Limiting
- YouTube API has quotas (10,000 units per day)
- The system implements caching to minimize API calls
- Rate limiting headers are included in responses

## Security Considerations

- API key is stored securely in environment variables
- All YouTube API calls are server-side only
- Input validation prevents malformed URLs
- CORS protection is maintained

## Performance Optimization

- YouTube API responses are cached when possible
- AI processing is optional to reduce costs
- Metadata extraction is parallelized where possible
- Thumbnail URLs are provided but not downloaded automatically

## Future Enhancements

Potential improvements to consider:
1. **Transcript Integration**: Extract and process video transcripts
2. **Chapter Detection**: Parse video chapters for better navigation
3. **Playlist Support**: Handle entire YouTube playlists
4. **Live Stream Detection**: Special handling for live content
5. **Comment Analysis**: Extract insights from video comments

## Troubleshooting

### Common Issues

**"Invalid YouTube URL" Error**
- Ensure the URL is a valid YouTube format
- Check for typos in the URL
- Try a different YouTube URL format

**"API quota exceeded" Error**
- YouTube API limits have been reached
- Wait for quota to reset (daily at midnight Pacific Time)
- Consider implementing caching more aggressively

**"Video not found" Error**
- Video may be private or deleted
- Check if the video is accessible in your region
- Verify the video ID is correct

### Debug Mode
Set `NODE_ENV=development` to see detailed logging:
- YouTube API requests and responses
- AI processing steps
- Error details and stack traces

## API Reference

For complete YouTube Data API v3 documentation, see:
[YouTube Data API Documentation](https://developers.google.com/youtube/v3)
