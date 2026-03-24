import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { validateApiKey } from '@/app/api/api-key-middleware';

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
    let requestUrl: string = '';

    try {
        // Validate API key first
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const requestData = await request.json();
        requestUrl = requestData.url;
        const { useAI = true } = requestData;

        if (!requestUrl) {
            return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
        }

        // Extract video ID from YouTube URL
        const videoId = extractYouTubeVideoId(requestUrl);
        if (!videoId) {
            return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        // Initialize YouTube API
        if (!process.env.YOUTUBE_API_KEY) {
            console.warn('YouTube API key not configured, falling back to basic extraction');
            return NextResponse.json(await basicYouTubeExtraction(requestUrl, videoId), {
                headers: {
                    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    'Vary': 'Origin'
                }
            });
        }

        // YouTube Data API v3 — videos.list
        // https://developers.google.com/youtube/v3/docs/videos/list
        const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        apiUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
        apiUrl.searchParams.set('id', videoId);
        apiUrl.searchParams.set('key', process.env.YOUTUBE_API_KEY);

        const videoResponse = await fetch(apiUrl.toString());

        const videoData = await videoResponse.json().catch(() => ({}));

        if (!videoResponse.ok || (videoData as { error?: unknown }).error) {
            const err = (videoData as { error?: { message?: string; code?: number } }).error;
            const reason =
                err?.message ||
                (videoResponse.status === 403 ? 'YouTube API access denied or quota exceeded' : null) ||
                'Failed to fetch video from YouTube API';
            if (err?.message) {
                console.error('YouTube Data API error:', err.code, err.message);
            }
            return NextResponse.json({ error: reason }, { status: videoResponse.ok ? 502 : videoResponse.status });
        }

        if (!videoData.items || videoData.items.length === 0) {
            return NextResponse.json({ error: 'Video not found or unavailable' }, { status: 404 });
        }

        const video = videoData.items[0];
        const snippet = video.snippet;
        const contentDetails = video.contentDetails;
        const statistics = video.statistics ?? {};

        const channelTitle = snippet.channelTitle || 'Unknown Channel';
        const channelId = snippet.channelId || '';
        const publishedAtIso = snippet.publishedAt || null;
        const publishedDate = publishedAtIso ? new Date(publishedAtIso) : null;
        const yearFromApi =
            publishedDate && !Number.isNaN(publishedDate.getTime())
                ? publishedDate.getFullYear()
                : null;

        // Extract basic metadata (authors + dates come from YouTube Data API snippet)
        const basicData = {
            title: snippet.title || '',
            authors: [channelTitle],
            year: yearFromApi,
            publishDate: publishedAtIso,
            source: 'YouTube',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            contentType: 'VIDEO' as const,
            abstract: snippet.description || '',
            autoKeywords: [],
            userKeywords: [],
            videoId,
            channelId,
            channelTitle,
            channelUrl: channelId ? `https://www.youtube.com/channel/${channelId}` : null,
            publishedAt: publishedAtIso,
            duration: contentDetails.duration,
            viewCount: parseInt(String(statistics.viewCount ?? '0'), 10),
            likeCount: parseInt(String(statistics.likeCount ?? '0'), 10),
            commentCount: parseInt(String(statistics.commentCount ?? '0'), 10),
            thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
            tags: snippet.tags || []
        };

        // If AI is disabled, return basic metadata
        if (!useAI) {
            return NextResponse.json(basicData, {
                headers: {
                    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    'Vary': 'Origin'
                }
            });
        }

        // Use AI for enhanced metadata extraction
        if (!process.env.GEMINI_API_KEY) {
            console.warn('Gemini API key not configured, returning basic YouTube metadata');
            return NextResponse.json(basicData, {
                headers: {
                    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    'Vary': 'Origin'
                }
            });
        }

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        // Prepare content for AI analysis
        const contentForAI = `
TITLE: ${basicData.title}
CHANNEL: ${basicData.channelTitle}
DESCRIPTION: ${basicData.abstract.substring(0, 2000)}
TAGS: ${basicData.tags.join(', ')}
DURATION: ${basicData.duration}
VIEWS: ${basicData.viewCount}
        `;

        const systemPrompt = `You are a metadata extraction assistant for YouTube videos. The channel name, publication year, and dates are already taken from the YouTube API — do not invent authors or dates.

Extract the following fields and return ONLY a JSON object:
- title (string): The title of the video (may lightly clean formatting)
- abstract (string): A concise summary of the video content
- source (string): Always "YouTube"
- contentType (string): Always "VIDEO"

Return exactly this JSON structure with no markdown formatting.`;

        try {
            const completion = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `${systemPrompt}\n\nVideo information to analyze:\n${contentForAI}`,
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

            // Extract keywords using AI
            let autoKeywords: string[] = [];
            try {
                const keywordCompletion = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Extract 5 to 8 concise, specific keywords from the following YouTube video information. Return only a JSON array of strings, no explanation.\n\nTitle: ${basicData.title}\nDescription: ${basicData.abstract.substring(0, 1000)}\nTags: ${basicData.tags.join(', ')}`,
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

            const finalData = {
                ...basicData,
                title: parsedData.title || basicData.title,
                abstract: parsedData.abstract || basicData.abstract,
                authors: basicData.authors,
                year: basicData.year,
                publishDate: basicData.publishDate,
                autoKeywords
            };

            return NextResponse.json(finalData, {
                headers: {
                    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    'Vary': 'Origin'
                }
            });

        } catch (error) {
            console.error('Error processing YouTube video with AI:', error);
            // Return basic metadata on AI failure
            return NextResponse.json(basicData, {
                headers: {
                    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    'Vary': 'Origin'
                }
            });
        }

    } catch (error) {
        console.error('Error fetching YouTube video:', error);

        // Return basic extraction as fallback
        const fallbackVideoId = extractYouTubeVideoId(requestUrl);
        if (fallbackVideoId) {
            return NextResponse.json(await basicYouTubeExtraction(requestUrl, fallbackVideoId), {
                headers: {
                    'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
                    'Vary': 'Origin'
                }
            });
        }

        return NextResponse.json({
            title: '',
            abstract: '',
            authors: [],
            source: 'YouTube',
            url: requestUrl,
            contentType: 'VIDEO',
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

function extractYouTubeVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

async function basicYouTubeExtraction(url: string, videoId: string) {
    return {
        title: '',
        abstract: '',
        authors: ['Unknown Channel'],
        source: 'YouTube',
        year: null,
        publishDate: null,
        url,
        contentType: 'VIDEO' as const,
        autoKeywords: [],
        userKeywords: [],
        videoId,
        channelId: null,
        channelTitle: 'Unknown Channel',
        channelUrl: null,
        publishedAt: null,
        duration: null,
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        tags: []
    };
}
