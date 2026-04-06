import { normalizeUrl } from './entryDedup';

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if URL is an RSS feed
 */
export function isRssFeedUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return normalized.includes('rss') ||
    normalized.includes('feed') ||
    normalized.includes('.xml') ||
    normalized.endsWith('/atom') ||
    normalized.includes('atom.xml');
}

/**
 * Get common RSS feed paths for a domain
 */
export function getCommonFeedPaths(baseUrl: string): string[] {
  const url = new URL(baseUrl);
  const domain = url.origin;

  return [
    `${domain}/feed`,
    `${domain}/rss`,
    `${domain}/rss.xml`,
    `${domain}/feed.xml`,
    `${domain}/atom.xml`,
    `${domain}/index.xml`,
    `${domain}/?feed=rss`,
    `${domain}/?feed=rss2`,
    `${domain}/?format=RSS`,
    `${domain}/feeds/posts/default`,
    `${domain}/rss/`,
    `${domain}/feed/`
  ];
}

/**
 * Fetch HTML and look for RSS feed links
 */
export async function discoverFeedFromHtml(url: string): Promise<string | null> {
  try {
    // Add user agent to avoid being blocked
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Corpus RSS Reader)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Look for RSS feed links in the HTML
    const feedRegex = /<link[^>]*rel=["'](?:alternate|alternate\s+type=["']application\/rss\+xml|alternate\s+type=["']application\/atom\+xml)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
    const matches: RegExpExecArray[] = [];
    let match;
    while ((match = feedRegex.exec(html)) !== null) {
      matches.push(match);
    }

    for (const match of matches) {
      let feedUrl = match[1];

      // Convert relative URLs to absolute
      if (feedUrl.startsWith('/')) {
        const base = new URL(url);
        feedUrl = base.origin + feedUrl;
      } else if (!feedUrl.startsWith('http')) {
        feedUrl = new URL(feedUrl, url).href;
      }

      if (feedUrl && isRssFeedUrl(feedUrl)) {
        return feedUrl;
      }
    }

    // If no feed links found, try common paths
    const commonPaths = getCommonFeedPaths(url);

    // Return the first common path (we'll test them later)
    return commonPaths[0] || null;
  } catch (error) {
    console.error(`[urlUtils] Error discovering feed from ${url}:`, error);
    return null;
  }
}

/**
 * Test if a URL is a valid RSS feed
 */
export async function testFeedUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Corpus RSS Reader)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return false;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('rss') ||
      contentType.includes('atom') ||
      contentType.includes('xml')) {
      return true;
    }

    // Check the content itself
    const text = await response.text();
    return text.includes('<rss') ||
      text.includes('<feed') ||
      text.includes('<rdf:RDF');
  } catch {
    return false;
  }
}

/**
 * Discover RSS feed URL from a website URL
 */
export async function discoverFeedUrl(url: string): Promise<string | null> {
  // If URL already looks like a feed, test it directly
  if (isRssFeedUrl(url)) {
    return await testFeedUrl(url) ? url : null;
  }

  // Try to discover from HTML
  const discoveredUrl = await discoverFeedFromHtml(url);
  if (!discoveredUrl) return null;

  // Test if it's actually a feed
  return await testFeedUrl(discoveredUrl) ? discoveredUrl : null;
}
