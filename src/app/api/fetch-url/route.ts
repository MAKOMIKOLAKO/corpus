import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { validateApiKey } from '@/app/api/api-key-middleware';

function isYouTubeUrl(url: string): boolean {
    const youtubePatterns = [
        /youtube\.com\/watch\?v=/,
        /youtu\.be\//,
        /youtube\.com\/embed\//,
        /youtube\.com\/shorts\//
    ];
    
    return youtubePatterns.some(pattern => pattern.test(url));
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
            'Access-Control-Max-Age': '86400',
            'Vary': 'Origin'
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        // Validate API key first
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const { url, useAI = true } = await request.json();
        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Check if this is a YouTube URL and redirect to YouTube-specific handler
        if (isYouTubeUrl(url)) {
            const youtubeResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/fetch-youtube`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': request.headers.get('x-api-key') || ''
                },
                body: JSON.stringify({ url, useAI })
            });

            if (youtubeResponse.ok) {
                const data = await youtubeResponse.json();
                return NextResponse.json(data, {
                    headers: {
                        'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                        'Vary': 'Origin'
                    }
                });
            }
        }

        // Handle partial failure gracefully (never throw)
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        }).catch(() => null);

        if (!response || !response.ok) {
            // Return bare minimum so form doesn't crash
            return NextResponse.json({
                title: '',
                abstract: '',
                authors: [],
                source: '',
                url,
                contentType: 'ARTICLE',
                autoKeywords: [],
                userKeywords: [],
            }, {
                headers: {
                    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    'Vary': 'Origin'
                }
            });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract basic metadata as fallback
        const basicTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
        const basicAbstract = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
        const authorMeta = $('meta[name="author"]').attr('content') || $('meta[property="article:author"]').attr('content') || '';
        const basicAuthors = authorMeta ? [authorMeta] : [];
        const basicSource = $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname || '';
        const pubDate = $('meta[property="article:published_time"]').attr('content');
        const basicYear = pubDate ? new Date(pubDate).getFullYear() : null;

        // If AI is disabled, return basic metadata
        if (!useAI) {
            return NextResponse.json({
                title: basicTitle.trim(),
                abstract: basicAbstract.trim(),
                authors: basicAuthors,
                source: basicSource.trim(),
                year: basicYear,
                url,
                contentType: 'ARTICLE',
                autoKeywords: [],
                userKeywords: [],
            }, {
                headers: {
                    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    'Vary': 'Origin'
                }
            });
        }

        // Prepare content for AI analysis
        const pageTitle = $('title').text() || '';
        const metaTags = $('meta').map((i, el) => {
            const name = $(el).attr('name') || $(el).attr('property');
            const content = $(el).attr('content');
            return name && content ? `${name}: ${content}` : null;
        }).get().filter(Boolean).join('\n');

        const pText = $('p').map((i, el) => $(el).text()).get().join('\n').substring(0, 4000);
        const rawContent = `TITLE: ${pageTitle}\n\nMETA TAGS:\n${metaTags}\n\nCONTENT EXCERPT:\n${pText}`;

        // Use AI for enhanced metadata extraction
        if (!process.env.GEMINI_API_KEY) {
            console.warn('Gemini API key not configured, falling back to basic extraction');
            return NextResponse.json({
                title: basicTitle.trim(),
                abstract: basicAbstract.trim(),
                authors: basicAuthors,
                source: basicSource.trim(),
                year: basicYear,
                url,
                contentType: 'ARTICLE',
                autoKeywords: [],
                userKeywords: [],
            }, {
                headers: {
                    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    'Vary': 'Origin'
                }
            });
        }

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const systemPrompt = `You are a metadata extraction assistant. Your job is to extract structured metadata from provided raw content (HTML excerpts) for a corpus application.

The target URL is: ${url}

Extract following fields and return ONLY a JSON object:
- title (string): The title of article, video, paper, or post.
- authors (array of strings): The authors, creators, or channel name. For videos, use channel name. For social posts, use author name or handle.
- year (number or null): The year of publication or posting.
- source (string): The journal, publisher, website name, or platform (e.g., "YouTube", "X", "Twitter", "LinkedIn", "Nature", "New York Times").
- abstract (string): A short abstract or summary of content.
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
            console.error('Failed to parse AI response:', resultText);
        }

        // Validate content type
        const validTypes = ['PAPER', 'BLOG', 'ESSAY', 'ARTICLE', 'POLICY_REPORT', 'BOOK', 'VIDEO', 'SOCIAL_POST', 'OTHER'];
        let finalContentType = parsedData.contentType;
        if (!validTypes.includes(finalContentType)) {
            finalContentType = 'OTHER';
        }

        // Extract keywords using AI
        let autoKeywords: string[] = [];
        try {
            const keywordCompletion = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Extract 5 to 8 concise, specific keywords from the following text. Return only a JSON array of strings, no explanation.\n\nText: ${parsedData.abstract || basicAbstract} ${parsedData.title || basicTitle}`,
                config: {
                    responseMimeType: 'application/json',
                }
            });

            const keywordResult = keywordCompletion.text || '[]';
            const parsedKeywords = JSON.parse(keywordResult);
            autoKeywords = Array.isArray(parsedKeywords) ? parsedKeywords.slice(0, 8) : [];
        } catch (e) {
            console.error('Failed to extract keywords:', e);
        }

        return NextResponse.json({
            title: parsedData.title || basicTitle.trim(),
            abstract: parsedData.abstract || basicAbstract.trim(),
            authors: Array.isArray(parsedData.authors) ? parsedData.authors : basicAuthors,
            source: parsedData.source || basicSource.trim(),
            year: typeof parsedData.year === 'number' ? parsedData.year : basicYear,
            url,
            contentType: finalContentType,
            autoKeywords,
            userKeywords: [],
        }, {
            headers: {
                'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                'Vary': 'Origin'
            }
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
            autoKeywords: [],
            userKeywords: [],
        }, {
            headers: {
                'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                'Vary': 'Origin'
            }
        });
    }
}
