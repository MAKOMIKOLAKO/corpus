import { NextResponse, NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { validateApiKey } from '../api-key-middleware';

function isYouTubeUrl(url: string): boolean {
    const youtubePatterns = [
        /youtube\.com\/watch\?v=/,
        /youtu\.be\//,
        /youtube\.com\/embed\//,
        /youtube\.com\/shorts\//
    ];
    return youtubePatterns.some((pattern) => pattern.test(url));
}

export async function POST(request: NextRequest) {
    try {
        // Validate API key first
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const { url, doi } = await request.json();

        if (!url && !doi) {
            return NextResponse.json({ error: 'URL or DOI is required' }, { status: 400 });
        }

        if (url && isYouTubeUrl(String(url).trim())) {
            const youtubeResponse = await fetch(
                `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/fetch-youtube`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': request.headers.get('x-api-key') || ''
                    },
                    body: JSON.stringify({ url: String(url).trim(), useAI: true })
                }
            );
            const data = await youtubeResponse.json().catch(() => ({}));
            if (youtubeResponse.ok) {
                return NextResponse.json({
                    title: data.title || '',
                    authors: Array.isArray(data.authors) ? data.authors : [],
                    year: typeof data.year === 'number' ? data.year : null,
                    publishDate: data.publishDate || data.publishedAt || null,
                    source: data.source || 'YouTube',
                    abstract: data.abstract || '',
                    contentType: 'VIDEO',
                    url: String(url).trim(),
                    doi: '',
                    channelId: data.channelId ?? null,
                    channelUrl: data.channelUrl ?? null
                });
            }
            return NextResponse.json(
                typeof data === 'object' && data !== null && 'error' in data
                    ? data
                    : { error: 'Failed to fetch YouTube metadata' },
                { status: youtubeResponse.status }
            );
        }

        let rawContent = '';
        let targetUrl = url;

        if (doi) {
            const cleanDoi = doi.trim();
            targetUrl = `https://doi.org/${cleanDoi}`;

            // Try fetching from CrossRef first for DOIs to get high-quality raw metadata
            const crossRefRes = await fetch(`https://api.crossref.org/works/${cleanDoi}`).catch(() => null);
            if (crossRefRes && crossRefRes.ok) {
                const data = await crossRefRes.json();
                // We stringify the raw JSON so the LLM can easily parse the relevant fields
                rawContent = JSON.stringify(data.message);
            }
        }

        // If we don't have CrossRef data, or it's just a URL, fetch the HTML
        if (!rawContent && targetUrl) {
            const response = await fetch(targetUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            }).catch(() => null);

            if (response && response.ok) {
                const html = await response.text();
                const $ = cheerio.load(html);

                // Extract useful text for the LLM to avoid sending the entire raw HTML (which might exceed token limits)
                const pageTitle = $('title').text() || '';
                const metaTags = $('meta').map((i, el) => {
                    const name = $(el).attr('name') || $(el).attr('property');
                    const content = $(el).attr('content');
                    return name && content ? `${name}: ${content}` : null;
                }).get().filter(Boolean).join('\n');

                // Get some text from paragraphs to help with abstract/summary
                const pText = $('p').map((i, el) => $(el).text()).get().join('\n').substring(0, 4000);

                rawContent = `TITLE: ${pageTitle}\n\nMETA TAGS:\n${metaTags}\n\nCONTENT EXCERPT:\n${pText}`;
            }
        }

        if (!rawContent) {
            return NextResponse.json({ error: 'Could not fetch content from the provided source' }, { status: 400 });
        }

        // Now pass to Gemini
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const systemPrompt = `You are a metadata extraction assistant. Your job is to extract structured metadata from the provided raw content (either HTML excerpts or JSON from CrossRef) for a corpus application.

The target URL/DOI is: ${targetUrl}

Extract the following fields and return ONLY a JSON object:
- title (string): The title of the article, video, paper, or post.
- authors (array of strings): The authors, creators, or channel name. For videos, use the channel name. For social posts, use the author name or handle.
- year (number or null): The year of publication or posting.
- source (string): The journal, publisher, website name, or platform (e.g., "YouTube", "X", "Twitter", "LinkedIn", "Nature", "New York Times").
- abstract (string): A short abstract or summary of the content.
- contentType (string): Must be exactly one of: "PAPER", "BLOG", "ESSAY", "ARTICLE", "POLICY_REPORT", "BOOK", "VIDEO", "SOCIAL_POST", "OTHER". Choose VIDEO for YouTube/Vimeo, SOCIAL_POST for X/Twitter/LinkedIn/Threads, PAPER for academic DOIs, ARTICLE for news, etc.

Return exactly this JSON structure with no markdown formatting.`;

        const completion = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${systemPrompt}\n\nContent to analyze:\n${rawContent.substring(0, 15000)}`,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.1,
            }
        });

        const resultText = completion.text || '{}';
        let parsedData: any = {};
        try {
            parsedData = JSON.parse(resultText);
        } catch (e) {
            console.error('Failed to parse OpenAI response:', resultText);
        }

        // Validate content type
        const validTypes = ['PAPER', 'BLOG', 'ESSAY', 'ARTICLE', 'POLICY_REPORT', 'BOOK', 'VIDEO', 'SOCIAL_POST', 'OTHER'];
        let finalContentType = parsedData.contentType;
        if (!validTypes.includes(finalContentType)) {
            finalContentType = 'OTHER';
        }

        return NextResponse.json({
            title: parsedData.title || '',
            authors: Array.isArray(parsedData.authors) ? parsedData.authors : [],
            year: typeof parsedData.year === 'number' ? parsedData.year : null,
            source: parsedData.source || '',
            abstract: parsedData.abstract || '',
            contentType: finalContentType,
            url: url || targetUrl, // Provide the url back if they used DOI
            doi: doi || '',
        });

    } catch (error) {
        console.error('Error in AI fetch:', error);
        return NextResponse.json({ error: 'Internal server error during metadata extraction' }, { status: 500 });
    }
}
