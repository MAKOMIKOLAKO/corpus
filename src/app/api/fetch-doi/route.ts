import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
    try {
        const { doi } = await request.json();
        if (!doi) {
            return NextResponse.json({ error: 'DOI is required' }, { status: 400 });
        }

        const cleanDoi = doi.trim();
        const response = await fetch(`https://api.crossref.org/works/${cleanDoi}`);

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch DOI metadata from CrossRef' }, { status: response.status });
        }

        const data = await response.json();
        const item = data.message;

        // Parse authors
        const authors = item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) || [];

        // Parse year
        const year = item.issued?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || null;

        // Parse source (journal/publisher)
        const source = item['container-title']?.[0] || item.publisher || null;

        // Parse title
        const title = item.title?.[0] || '';

        // Generate keywords using AI
        let autoKeywords: string[] = [];
        if (title || item.abstract) {
            try {
                const ai = new GoogleGenAI({
                    apiKey: process.env.GEMINI_API_KEY || '',
                });

                const textForAnalysis = `${title}. ${item.abstract || ''}`;
                const completion = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Extract 5 to 8 concise, specific keywords from the following text. Return only a JSON array of strings, no explanation.\n\nText: ${textForAnalysis}`,
                    config: {
                        responseMimeType: 'application/json',
                    }
                });

                const resultText = completion.text || '[]';
                const parsedKeywords = JSON.parse(resultText);
                autoKeywords = Array.isArray(parsedKeywords) ? parsedKeywords.slice(0, 8) : [];
            } catch (error) {
                console.error('Failed to generate keywords for DOI:', error);
                // Continue without keywords if generation fails
            }
        }

        return NextResponse.json({
            title,
            authors,
            year,
            source,
            abstract: item.abstract || null,
            doi: cleanDoi,
            contentType: 'PAPER',
            autoKeywords,
            userKeywords: [],
        });
    } catch (error) {
        console.error('Error fetching DOI:', error);
        return NextResponse.json({ error: 'Internal server error while fetching DOI' }, { status: 500 });
    }
}
