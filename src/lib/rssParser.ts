import Parser from 'rss-parser';
import { normalizeUrl, normalizeTitle, normalizeFirstAuthor } from './entryDedup';

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: [
      ['author', 'author'],
      ['dc:creator', 'author'],
      ['pubDate', 'pubDate'],
      ['dc:date', 'pubDate'],
      ['content:encoded', 'content'],
      ['description', 'description']
    ]
  }
});

function extractDescription(item: any, content: string | null): string | null {
  const snippetCandidates = [
    item.contentSnippet,
    item.summary,
    item.description,
    content
  ];

  for (const candidate of snippetCandidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) {
      continue;
    }

    const cleaned = cleanText(candidate);
    if (cleaned.length > 0) {
      return cleaned.length > 1200 ? `${cleaned.slice(0, 1197)}...` : cleaned;
    }
  }

  return null;
}

export interface ParsedFeedItem {
  title: string;
  url: string | null;
  author: string | null;
  publishedDate: Date | null;
  description: string | null;
  content: string | null;
}

export interface ParsedFeed {
  title: string | null;
  description: string | null;
  items: ParsedFeedItem[];
}

/**
 * Parse an RSS/Atom feed from a URL
 */
export async function parseFeed(feedUrl: string): Promise<ParsedFeed> {
  try {
    const feed = await parser.parseURL(feedUrl);

    const items: ParsedFeedItem[] = feed.items.map(item => {
      const content = item.content || item['content:encoded'] || null;
      const description = extractDescription(item, content);

      return {
        title: cleanText(item.title || ''),
        url: normalizeUrl(item.link || item.guid || '') || null,
        author: extractAuthor(item),
        publishedDate: parseDate(item.pubDate || item['dc:date'] || item.isoDate),
        description,
        content
      };
    }).filter(item => item.title.length > 0);

    return {
      title: cleanText(feed.title || ''),
      description: cleanText(feed.description || ''),
      items
    };
  } catch (error) {
    console.error(`[rssParser] Error parsing feed ${feedUrl}:`, error);
    throw new Error(`Failed to parse feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract author from feed item
 */
function extractAuthor(item: any): string | null {
  const author = item.author || item.creator || item['dc:creator'];
  if (!author) return null;

  // Clean up author name
  return cleanText(author).replace(/^by\s+/i, '');
}

/**
 * Parse publication date from various formats
 */
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    // Check if date is valid
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Clean text content
 */
function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Normalize feed item for deduplication
 */
export function normalizeFeedItem(item: ParsedFeedItem) {
  return {
    normalizedTitle: item.title ? normalizeTitle(item.title) : null,
    normalizedFirstAuthor: item.author ? normalizeFirstAuthor([item.author]) : null,
    publicationYear: item.publishedDate?.getFullYear() || null,
    canonicalUrl: item.url
  };
}
