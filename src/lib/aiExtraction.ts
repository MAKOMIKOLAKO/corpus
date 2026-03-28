/**
 * Server-side AI extraction utilities
 * Direct calls to Google AI without HTTP requests
 */

import { Chat, GoogleGenAI } from '@google/genai';

// Initialize GoogleGenAI and chat
const genai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || ''
});
const chat = new Chat((genai as any).models.apiClient, genai.models, 'gemini-pro');

export interface AIMetadata {
  title: string;
  authors: string[];
  year?: number;
  summary: string;
}

/**
 * Extract metadata from text using Google AI
 */
export async function extractMetadataFromAI(url: string, text: string): Promise<AIMetadata> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('Google AI API key is not configured');
  }

  const prompt = `Extract structured metadata from the following web content. Return a valid JSON object with these exact fields:
- title: The main title of the content
- authors: Array of author names (empty array if none found)
- year: Publication year as a number (null if not found)
- summary: A two-sentence summary of the content

URL: ${url}

Content:
${text.slice(0, 8000)} // Limit text to manage token usage

Respond with only the JSON object, no other text.`;

  try {
    const response = await chat.sendMessage({ message: prompt });
    const content = response.text;

    if (!content) {
      console.error('AI Response: No content received');
      throw new Error('No response from AI');
    }

    console.log('AI Response Content:', content);

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI Response: No JSON found in:', content);
      throw new Error('No JSON found in AI response');
    }

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

    return metadata;
  } catch (error: any) {
    console.error('Failed to parse AI response:', error);
    throw new Error('Invalid JSON response from AI');
  }
}

/**
 * Generate a summary using Google AI
 */
export async function generateSummary(text: string, maxSentences: number = 2): Promise<string> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('Google AI API key is not configured');
  }

  const prompt = `Create a concise summary of exactly ${maxSentences} sentence(s) for the following text. The summary should capture the main points clearly and briefly.

Text:
${text.slice(0, 4000)} // Limit text to manage token usage

Summary:`;

  try {
    const response = await chat.sendMessage({ message: prompt });
    const summary = response.text?.trim();

    if (!summary) {
      throw new Error('No response from AI');
    }

    return summary;
  } catch (error: any) {
    console.error('Summarization error:', error);
    throw new Error('Failed to generate summary');
  }
}
