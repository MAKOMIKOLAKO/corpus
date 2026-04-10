/**
 * AI endpoint for generating summaries
 */

import { NextRequest, NextResponse } from 'next/server';
import { Chat, GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || ''
});
const chat = new Chat((genai as any).models.apiClient, genai.models, 'gemini-1.5-flash');

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

    const response = await chat.sendMessage({ message: prompt });
    const summary = response.text?.trim();

    if (!summary) {
      throw new Error('No response from AI');
    }

    return NextResponse.json({ summary });

  } catch (error: unknown) {
    console.error('[api/ai/summarize]', error);

    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('API_KEY')) {
      return NextResponse.json(
        { error: 'AI service configuration error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
