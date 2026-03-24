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
            return NextResponse.json({ error: 'Text is required for topic extraction' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const completion = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Assign 1 to 3 broad academic or editorial topic labels to the following text. Topics should be mid-level in specificity — broad enough to group many related entries together, but specific enough to be meaningful. For example, use 'Robotics Research' instead of 'Wearable Exoskeleton Motor Control', and use 'Economics' instead of 'Social Sciences'. Return only a JSON array of strings, no explanation.\n\nText: ${text}`,
            config: {
                responseMimeType: 'application/json',
            }
        });

        const resultText = completion.text || '[]';
        let topics: string[] = [];
        try {
            const parsed = JSON.parse(resultText);
            if (Array.isArray(parsed)) {
                topics = parsed;
            }
        } catch (e) {
            console.error('Failed to parse topics response:', resultText);
        }

        // Limit to 3 topics as specified
        topics = topics.slice(0, 3);

        return NextResponse.json({ topics });
    } catch (error) {
        console.error('Error generating topics:', error);
        return NextResponse.json({ error: 'Failed to generate topics' }, { status: 500 });
    }
}
