/**
 * Search papers API endpoint
 * Returns multiple paper results for user selection
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json(
      { error: 'Missing search query' },
      { status: 400 }
    );
  }

  try {
    const searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,authors,year,abstract,venue,url,doi&limit=8`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Semantic Scholar search failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      results: data.data || [],
      total: data.total || 0
    });

  } catch (error) {
    console.error('Paper search error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search papers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
