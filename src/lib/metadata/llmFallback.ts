import { GoogleGenAI } from '@google/genai';
import type { NormalizedMetadata } from './types';
import { mergeMetadata } from './cleanup';

interface LLMExtractedMetadata {
  title?: string;
  authors?: string[];
  year?: number;
  abstract?: string;
  source?: string;
  topics?: string[];
}

export async function runLLMFallback(
  partialMetadata: NormalizedMetadata,
  visibleText: string,
  apiKey: string
): Promise<NormalizedMetadata> {
  if (!apiKey) {
    console.warn('No API key provided for LLM fallback');
    return partialMetadata;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a metadata extraction assistant for academic content. Extract structured metadata from the provided text.

IMPORTANT: Only extract information that is clearly present in the text. Do not invent or hallucinate data.

Return ONLY a JSON object with these fields (all optional):
- title (string): The paper/book title
- authors (array of strings): Author names
- year (number): Publication year
- abstract (string): Abstract or summary
- source (string): Journal, conference, or publisher name
- topics (array of strings): 3-5 research topics or fields of study

Return exactly this JSON structure with no markdown formatting.`;

    const userPrompt = `Current metadata (may be incomplete):
Title: ${partialMetadata.title || 'Unknown'}
Authors: ${partialMetadata.authors.join(', ') || 'Unknown'}
Year: ${partialMetadata.year || 'Unknown'}
Source: ${partialMetadata.source || 'Unknown'}

Text to analyze:
${visibleText.substring(0, 10000)}`;

    const completion = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemPrompt}\n\n${userPrompt}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const resultText = completion.text || '{}';
    const extracted: LLMExtractedMetadata = JSON.parse(resultText);

    const llmMetadata: Partial<NormalizedMetadata> = {
      title: extracted.title,
      authors: extracted.authors,
      year: extracted.year,
      abstract: extracted.abstract,
      source: extracted.source,
      topics: extracted.topics || [],
      metadata: {},
    };

    return mergeMetadata(partialMetadata, llmMetadata, true);
  } catch (error) {
    console.error('LLM fallback error:', error);
    return partialMetadata;
  }
}

export function extractVisibleText(html: string): string {
  const textWithoutScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  const textWithoutTags = textWithoutScripts.replace(/<[^>]+>/g, ' ');

  const decoded = textWithoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const cleaned = decoded
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}
