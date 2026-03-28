/**
 * AI endpoint for extracting metadata from web content
 */

import { NextRequest, NextResponse } from 'next/server';
import { Chat, GoogleGenAI } from '@google/genai';

// Initialize GoogleGenAI and chat
const genai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || ''
});
const chat = new Chat((genai as any).models.apiClient, genai.models, 'gemini-pro');

export async function POST(request: NextRequest) {
  try {
    const { url, text } = await request.json();

    if (!url || !text) {
      return NextResponse.json(
        { error: 'Missing url or text' },
        { status: 400 }
      );
    }

    const prompt = `Extract structured metadata from the following web content. Return a valid JSON object with these exact fields:
- title: The main title of the content
- authors: Array of author names (empty array if none found)
- year: Publication year as a number (null if not found)
- summary: A two-sentence summary of the content

URL: ${url}

Content:
${text}

Respond with only the JSON object, no other text.`;

    const response = await chat.sendMessage({ message: prompt });
    const content = response.text;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    try {
      const metadata = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!metadata.title || typeof metadata.title !== 'string') {
        metadata.title = 'Untitled';
      }

      if (!Array.isArray(metadata.authors)) {
        metadata.authors = [];
      }

      if (metadata.year && typeof metadata.year !== 'number') {
        metadata.year = parseInt(metadata.year) || null;
      }

      if (!metadata.summary || typeof metadata.summary !== 'string') {
        metadata.summary = '';
      }

      return NextResponse.json(metadata);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

  } catch (error: any) {
    console.error('Metadata extraction error:', error);

    if (error?.message?.includes('API_KEY')) {
      return NextResponse.json(
        { error: 'AI service configuration error', details: 'Invalid API key' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to extract metadata',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
