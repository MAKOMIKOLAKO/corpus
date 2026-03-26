import { NextResponse, NextRequest } from 'next/server';
import { validateApiKey } from '../api-key-middleware';
import { geminiCache } from '@/lib/geminiCache';
import { geminiQueue } from '@/lib/geminiQueue';
import { generateFallbackMetadata } from '@/lib/metadataFallbacks';

export async function POST(request: NextRequest) {
    try {
        // Validate API key first
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const { text } = await request.json();
        if (!text) {
            return NextResponse.json({ error: 'Text is required for metadata extraction' }, { status: 400 });
        }

        // Check cache first
        const cached = geminiCache.get(text);
        if (cached) {
            return NextResponse.json({
                topics: cached.topics || [],
                keywords: cached.keywords || [],
                cached: true
            });
        }

        try {
            // Use queue to prevent rate limiting
            const result = await geminiQueue.enqueue(text);

            // Cache the results
            geminiCache.set(text, result.topics, result.keywords);

            return NextResponse.json({
                topics: result.topics,
                keywords: result.keywords,
                cached: false
            });
        } catch (apiError) {
            console.warn('Gemini API failed, using fallback:', apiError);

            // Use fallback when API fails
            const fallbackResult = generateFallbackMetadata(text);

            // Cache fallback results with shorter TTL (1 hour)
            geminiCache.set(text, fallbackResult.topics, fallbackResult.keywords, 60 * 60 * 1000);

            return NextResponse.json({
                topics: fallbackResult.topics,
                keywords: fallbackResult.keywords,
                cached: false,
                fallback: true
            });
        }
    } catch (error) {
        console.error('Error generating metadata:', error);

        // Return appropriate error status based on error type
        if (error instanceof Error) {
            if (error.message.includes('timeout')) {
                return NextResponse.json({ error: 'Request timeout - please try again' }, { status: 408 });
            }
            if (error.message.includes('API key')) {
                return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Failed to generate metadata' }, { status: 500 });
    }
}
