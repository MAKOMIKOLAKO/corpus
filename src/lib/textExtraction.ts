/**
 * Server-side text extraction utilities
 * Handles fetching and extracting text from URLs
 */

import * as cheerio from 'cheerio';

export interface ExtractedContent {
    text: string;
    title?: string;
    description?: string;
    author?: string;
    siteName?: string;
    publishedDate?: string;
}

/**
 * Fetch and extract text content from a URL
 * This runs server-side to avoid CORS issues
 */
export async function fetchAndExtractText(url: string): Promise<ExtractedContent> {
    // Validate URL format
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Invalid URL format');
    }

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
    }

    // Fetch the URL content with proper headers
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        },
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    // Get content type
    const contentType = response.headers.get('content-type') || '';
    
    // Only process HTML content
    if (!contentType.includes('text/html')) {
        throw new Error('URL does not point to HTML content');
    }

    // Get HTML content
    const html = await response.text();

    // Parse HTML and extract text using cheerio
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar, .menu, .navigation, .comments, .related, .popup').remove();

    // Get text from main content areas
    let text = '';
    
    // Try to find main content area in order of preference
    const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '#content',
        '.main',
        '.post-body',
        '.story-body'
    ];
    
    for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
            text = element.first().text();
            break;
        }
    }
    
    // Fallback to body if no specific content area found
    if (!text) {
        text = $('body').text();
    }

    // Clean up text
    text = text
        .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
        .replace(/\n\s*\n/g, '\n')  // Replace multiple newlines with single newline
        .replace(/^\s+|\s+$/g, '')  // Trim leading and trailing whitespace
        .trim();

    // Extract metadata
    const metadata = {
        title: $('title').first().text().trim() || '',
        description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '',
        author: $('meta[name="author"]').attr('content') || $('meta[property="article:author"]').attr('content') || '',
        siteName: $('meta[property="og:site_name"]').attr('content') || '',
        publishedDate: $('meta[property="article:published_time"]').attr('content') || 
                      $('meta[name="date"]').attr('content') || 
                      $('meta[property="article:published"]').attr('content') || '',
    };

    // Limit text length to manage token usage
    const maxLength = 10000;
    if (text.length > maxLength) {
        text = text.substring(0, maxLength) + '...';
    }

    return {
        text,
        ...metadata,
    };
}
