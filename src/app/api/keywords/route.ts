import { NextResponse, NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { validateApiKey } from '../api-key-middleware';

export async function POST(request: NextRequest) {
    try {
        // Validate API key first
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }

        const { text } = await request.json();
        if (!text) {
            return NextResponse.json({ error: 'Text is required for keyword extraction' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const completion = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a metadata extraction assistant. Extract 5 to 8 concise, specific keywords from the following academic or editorial text. Return only a JSON array of strings, no explanation.\n\nText: ${text}`,
            config: {
                responseMimeType: 'application/json',
            }
        });

        const resultText = completion.text || '{"keywords": []}';
        let keywords: string[] = [];
        try {
            // The model might return {"keywords": [...]} or just an array.
            // We asked for a JSON array of strings, so it might return `[]`. But response_format: 'json_object' requires returning a JSON object.
            // Oh wait, if we used `type: 'json_object'`, we must tell it to return JSON object.
            const parsed = JSON.parse(resultText);
            if (Array.isArray(parsed)) {
                keywords = parsed;
            } else if (parsed.keywords && Array.isArray(parsed.keywords)) {
                keywords = parsed.keywords;
            }
        } catch (e) {
            console.error('Failed to parse OpenAI response:', resultText);
        }

        // Limit to 8 just in case
        keywords = keywords.slice(0, 8);

        return NextResponse.json({ keywords });
    } catch (error) {
        console.error('Error generating keywords:', error);
        return NextResponse.json({ error: 'Failed to generate keywords' }, { status: 500 });
    }
}
