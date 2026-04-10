/**
 * Server-side AI extraction utilities
 * Direct calls to Google AI without HTTP requests
 */

import { Chat, GoogleGenAI } from '@google/genai';

// Initialize GoogleGenAI and chat
const genai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || ''
});
const chat = new Chat((genai as any).models.apiClient, genai.models, 'gemini-1.5-flash');

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

  const prompt = `Extract structured metadata from the following web content. You MUST respond with a valid JSON object only. Do not include any explanations, markdown formatting, or text outside the JSON.

Required JSON format:
{
  "title": "The main title of the content",
  "authors": ["Author name 1", "Author name 2"] or [],
  "year": 2024 or null,
  "summary": "A two-sentence summary of the content"
}

URL: ${url}

Content:
${text.slice(0, 8000)}

JSON Response:`;

  try {
    const response = await chat.sendMessage({ message: prompt });
    const content = response.text;

    if (!content) {
      console.error('AI Response: No content received');
      throw new Error('No response from AI');
    }

    console.log('AI Response Content:', content);

    // Try to extract JSON from response - handle various formats
    let jsonText = '';

    // Method 1: Look for JSON object in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      // Method 2: Try to parse the entire response as JSON
      try {
        JSON.parse(content);
        jsonText = content;
      } catch {
        // Method 3: Look for JSON between ```json and ``` markers
        const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1];
        } else {
          console.error('AI Response: No JSON found in:', content);
          throw new Error('No JSON found in AI response');
        }
      }
    }

    // Clean up the JSON text
    jsonText = jsonText
      .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
      .replace(/[\u2018\u2019]/g, "'") // Replace smart apostrophes
      .trim();

    let metadata;
    try {
      metadata = JSON.parse(jsonText);
    } catch (parseError: any) {
      console.error('JSON Parse Error:', parseError);
      console.error('Attempted to parse:', jsonText);
      throw new Error(`Invalid JSON from AI: ${parseError?.message || 'Unknown parse error'}`);
    }

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

    // Fallback: Try to extract basic metadata from the text itself
    const fallbackMetadata = {
      title: extractTitleFromText(text),
      authors: [], // Can't reliably extract authors without AI
      year: extractYearFromText(text) || undefined,
      summary: extractBasicSummary(text)
    };

    console.log('Using fallback metadata extraction');
    return fallbackMetadata;
  }
}

/**
 * Extract basic metadata from text without AI
 */
function extractTitleFromText(text: string): string {
  // Look for title patterns - first line, or common title indicators
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  // Try to find a title-like line (shorter, not just URLs or dates)
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 200 &&
      !trimmed.startsWith('http') &&
      !/^\d{4}$/.test(trimmed) &&
      !trimmed.toLowerCase().includes('skip to')) {
      return trimmed;
    }
  }

  return 'Untitled';
}

function extractYearFromText(text: string): number | null {
  // Look for 4-digit years between 1900 and current year
  const yearMatch = text.match(/\b(19|20)\d{2}\b/g);
  if (yearMatch) {
    const currentYear = new Date().getFullYear();
    for (const year of yearMatch) {
      const yearNum = parseInt(year);
      if (yearNum >= 1900 && yearNum <= currentYear) {
        return yearNum;
      }
    }
  }
  return null;
}

function extractBasicSummary(text: string): string {
  // Take first few sentences as summary
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  return sentences.slice(0, 2).join('. ').trim() + (sentences.length > 2 ? '.' : '');
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
