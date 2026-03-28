/**
 * AI endpoint for generating summaries
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/genai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { text, maxSentences = 2 } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text' },
        { status: 400 }
      );
    }

    const prompt = `Create a concise summary of exactly ${maxSentences} sentence(s) for the following text. The summary should capture the main points clearly and briefly.

Text:
${text}

Summary:`;

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text()?.trim();

    if (!summary) {
      throw new Error('No response from AI');
    }

    return NextResponse.json({ summary });

  } catch (error: any) {
    console.error('Summarization error:', error);

    if (error?.message?.includes('API_KEY')) {
      return NextResponse.json(
        { error: 'AI service configuration error', details: 'Invalid API key' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
