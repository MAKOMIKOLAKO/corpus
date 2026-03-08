import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
    try {
        const { url } = await request.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Handle partial failure gracefully (never throw)
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        }).catch(() => null);

        if (!response || !response.ok) {
            // Return bare minimum so the form doesn't crash
            return NextResponse.json({
                title: '',
                abstract: '',
                authors: [],
                source: '',
                url,
                contentType: 'ARTICLE',
            });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract title
        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';

        // Extract description/abstract
        const abstract = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';

        // Extract author
        const authorMeta = $('meta[name="author"]').attr('content') || $('meta[property="article:author"]').attr('content') || '';
        const authors = authorMeta ? [authorMeta] : [];

        // Extract source/site name
        const source = $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname || '';

        // Optional: Try to find a publish year
        const pubDate = $('meta[property="article:published_time"]').attr('content');
        const year = pubDate ? new Date(pubDate).getFullYear() : null;

        return NextResponse.json({
            title: title.trim(),
            abstract: abstract.trim(),
            authors,
            source: source.trim(),
            year,
            url,
            contentType: 'ARTICLE',
        });
    } catch (error) {
        console.error('Error fetching URL:', error);
        // Return empty but valid data on complete failure to prevent block
        return NextResponse.json({
            title: '',
            abstract: '',
            authors: [],
            source: '',
            url: '',
            contentType: 'ARTICLE',
        });
    }
}
