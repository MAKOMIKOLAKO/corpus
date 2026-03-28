/**
 * API endpoint for fetching and extracting text content from URLs
 * Runs server-side to avoid CORS issues
 */

import { NextRequest, NextResponse } from 'next/server';

// Import cheerio for HTML parsing
const cheerio = require('cheerio');

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export async function POST(request: NextRequest) {
    try {

        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Validate URL format
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // Only allow http/https protocols
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return NextResponse.json(
                { error: 'Only HTTP and HTTPS URLs are supported' },
                { status: 400 }
            );
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
            return NextResponse.json(
                { error: 'URL does not point to HTML content' },
                { status: 400 }
            );
        }

        // Get HTML content
        const html = await response.text();

        // Parse HTML and extract text using cheerio
        const $ = cheerio.load(html);

        // Remove unwanted elements
        $('script, style, nav, header, footer, aside, .ad, .advertisement, .sidebar, .menu, .navigation').remove();

        // Get text from main content areas
        let text = '';

        // Try to find main content area
        const mainContent = $('main, article, .content, .post-content, .entry-content, #content, .main');

        if (mainContent.length > 0) {
            text = mainContent.first().text();
        } else {
            // Fallback to body
            text = $('body').text();
        }

        // Clean up text
        text = text
            .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
            .replace(/\n\s*\n/g, '\n')  // Replace multiple newlines with single newline
            .trim();

        // Extract metadata
        const metadata = {
            title: $('title').first().text().trim() || '',
            description: $('meta[name="description"]').attr('content') || '',
            author: $('meta[name="author"]').attr('content') || '',
            siteName: $('meta[property="og:site_name"]').attr('content') || '',
            publishedDate: $('meta[property="article:published_time"], meta[name="date"]').attr('content') || '',
        };

        // Limit text length to manage token usage
        const maxLength = 10000;
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '...';
        }

        return NextResponse.json({
            url,
            text,
            metadata,
            contentLength: text.length,
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
            }
        });

    } catch (error: any) {
        console.error('Error fetching URL content:', error);

        // Handle timeout specifically
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
            return NextResponse.json(
                { error: 'Request timeout - the URL took too long to respond' },
                { status: 408 }
            );
        }

        return NextResponse.json(
            {
                error: 'Failed to fetch URL content',
                details: error.message
            },
            { status: 500 }
        );
    }
}
