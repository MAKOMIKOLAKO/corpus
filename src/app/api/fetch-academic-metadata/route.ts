import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { buildEntryFromURL, buildEntryFromDOI } from '@/lib/metadata/orchestrator';
import { GoogleGenAI } from '@google/genai';

export async function OPTIONS(request: NextRequest) {
  const allowedOrigins = [
    'chrome-extension://*',
    process.env.NEXTAUTH_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://usecorpus.app'
  ];
  const origin = request.headers.get('origin');
  const isAllowedOrigin = allowedOrigins.some(allowed =>
    allowed === 'chrome-extension://*' || allowedOrigins.includes(origin || '')
  );
  const allowedOrigin = isAllowedOrigin ? (origin || allowedOrigins[1]) : allowedOrigins[1];

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateApiKey(request);
    if (!validation.valid) {
      return validation.response;
    }

    const { url, doi } = await request.json();

    if (!url && !doi) {
      return NextResponse.json(
        { error: 'URL or DOI is required' },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    let result;
    if (doi) {
      result = await buildEntryFromDOI(doi, geminiApiKey);
    } else {
      result = await buildEntryFromURL(url, geminiApiKey);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to extract metadata' },
        { status: 400 }
      );
    }

    const metadata = result.metadata!;

    let autoKeywords: string[] = [];
    if (geminiApiKey && (metadata.title || metadata.abstract)) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const textForAnalysis = `${metadata.title || ''}. ${metadata.abstract || ''}`;
        
        const completion = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Extract 5 to 8 concise, specific keywords from the following academic text. Return only a JSON array of strings, no explanation.\n\nText: ${textForAnalysis.substring(0, 2000)}`,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const resultText = completion.text || '[]';
        const parsedKeywords = JSON.parse(resultText);
        autoKeywords = Array.isArray(parsedKeywords) ? parsedKeywords.slice(0, 8) : [];
      } catch (error) {
        console.error('Failed to generate keywords:', error);
      }
    }

    const response = {
      title: metadata.title,
      authors: metadata.authors,
      year: metadata.year,
      source: metadata.source,
      abstract: metadata.abstract,
      url: metadata.url,
      doi: metadata.doi || '',
      contentType: 'PAPER',
      autoKeywords,
      userKeywords: [],
      topics: metadata.topics,
      metadata: metadata.metadata,
      confidence: metadata.confidence,
      extractionSource: result.source,
    };

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'Vary': 'Origin'
      }
    });

  } catch (error) {
    console.error('Error in academic metadata extraction:', error);
    return NextResponse.json(
      { error: 'Internal server error during metadata extraction' },
      { status: 500 }
    );
  }
}
