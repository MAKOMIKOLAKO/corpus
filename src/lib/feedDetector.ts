// HIDDEN — only used by disabled features
import { parseFeed, ParsedFeed } from './rssParser';
import { discoverFeedUrl, extractDomain } from './urlUtils';

export interface FeedDiscoveryResult {
  feedUrl: string;
  title: string | null;
  description: string | null;
  items: Array<{
    title: string;
    url: string | null;
    publishedDate: Date | null;
  }>;
  domain: string;
}

/**
 * Discover and preview an RSS feed from a URL
 */
export async function discoverFeed(url: string): Promise<FeedDiscoveryResult | null> {
  try {
    // Discover the feed URL
    const feedUrl = await discoverFeedUrl(url);
    if (!feedUrl) {
      return null;
    }
    
    // Parse the feed
    const feed = await parseFeed(feedUrl);
    
    // Get domain
    const domain = extractDomain(feedUrl) || extractDomain(url) || '';
    
    // Return preview with first 5 items
    return {
      feedUrl,
      title: feed.title,
      description: feed.description,
      domain,
      items: feed.items.slice(0, 5).map(item => ({
        title: item.title,
        url: item.url,
        publishedDate: item.publishedDate
      }))
    };
  } catch (error) {
    console.error(`[feedDetector] Error discovering feed for ${url}:`, error);
    return null;
  }
}

/**
 * Validate a feed URL and return basic info
 */
export async function validateFeed(feedUrl: string): Promise<{
  valid: boolean;
  title?: string;
  domain?: string;
  error?: string;
}> {
  try {
    const feed = await parseFeed(feedUrl);
    const domain = extractDomain(feedUrl);
    
    return {
      valid: true,
      title: feed.title || undefined,
      domain: domain || undefined
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to validate feed'
    };
  }
}
