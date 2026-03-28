/**
 * Metadata extraction services
 * Handles LLM-based extraction and API integrations
 */

import { ContentType } from '@prisma/client';

export interface ExtractedMetadata {
  title: string;
  authors: string[];
  year?: number;
  summary: string;
  url?: string;
  doi?: string;
  source?: string;
  abstract?: string;
  contentType: ContentType;
}

/**
 * Extract metadata from a URL using LLM
 */
export async function extractMetadataFromLink(url: string): Promise<ExtractedMetadata> {
  // Fetch visible text from the URL
  const text = await fetchVisibleText(url);

  // Call LLM to extract structured metadata
  const response = await fetch('/api/ai/extract-metadata', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      text: text.slice(0, 8000), // Limit text to manage token usage
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to extract metadata: ${response.statusText}`);
  }

  const metadata = await response.json();

  return cleanAndNormalizeMetadata({
    ...metadata,
    url,
    contentType: 'ARTICLE',
  });
}

/**
 * Fetch book metadata from Open Library API
 */
export async function fetchBookByTitle(title: string): Promise<ExtractedMetadata> {
  // Check if input is an Open Library URL
  if (title.startsWith('https://openlibrary.org/')) {
    // Extract the key from the URL
    const keyMatch = title.match(/\/works\/(OL\d+)W/);
    if (keyMatch) {
      const workKey = `/works/${keyMatch[1]}W`;
      return await fetchBookByKey(workKey);
    }
  }

  // Otherwise search by title
  const searchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&fields=key,title,author_name,first_publish_year,isbn,cover_i&limit=5`;

  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Open Library search failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.docs || data.docs.length === 0) {
    throw new Error('No books found matching this title');
  }

  const book = data.docs[0];
  const workKey = book.key;

  return await fetchBookByKey(workKey);
}

/**
 * Fetch book by Open Library key
 */
async function fetchBookByKey(workKey: string): Promise<ExtractedMetadata> {
  // Fetch detailed book information
  const workUrl = `https://openlibrary.org${workKey}.json`;
  const workResponse = await fetch(workUrl);

  if (!workResponse.ok) {
    throw new Error(`Failed to fetch book details: ${workResponse.statusText}`);
  }

  const workData = await workResponse.json();

  let summary = '';
  if (workData.description) {
    if (typeof workData.description === 'string') {
      summary = workData.description;
    } else if (workData.description?.type === 'text') {
      summary = workData.description.value || '';
    } else if (workData.description?.value) {
      summary = workData.description.value;
    }
    // Clean up quotes and extra formatting
    summary = summary.replace(/^"|"$/g, '').trim();
  }

  // If no summary, use LLM to generate one
  if (!summary) {
    summary = await summarizeWithLLM(`Book: ${workData.title} by ${workData.authors?.map((a: any) => a.name || a).join(', ')}`, 2);
  }

  const coverUrl = workData.covers?.length > 0
    ? `https://covers.openlibrary.org/b/id/${workData.covers[0]}-M.jpg`
    : undefined;

  return cleanAndNormalizeMetadata({
    title: workData.title,
    authors: workData.authors?.map((a: any) => a.name || a).filter(Boolean) || [],
    year: workData.created?.value?.substring(0, 4) ? parseInt(workData.created.value.substring(0, 4)) : undefined,
    summary,
    url: `https://openlibrary.org${workKey}`,
    source: 'Open Library',
    contentType: 'BOOK',
    cover: coverUrl,
    isbn13: workData.isbn_13 || [],
  });
}

/**
 * Fetch paper metadata from Semantic Scholar API
 */
export async function fetchPaperByTitle(title: string): Promise<ExtractedMetadata> {
  // Check if input is a DOI
  if (title.startsWith('10.') && title.includes('/')) {
    return await fetchPaperByDoi(title);
  }

  // Otherwise search by title
  const searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(title)}&fields=title,authors,year,abstract,venue,url,doi&limit=5`;

  const response = await fetch(searchUrl, {
    headers: {
      'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Semantic Scholar search failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new Error('No papers found matching this title');
  }

  const paper = data.data[0];

  // Generate summary from abstract using LLM
  let summary = '';
  if (paper.abstract) {
    summary = await summarizeWithLLM(paper.abstract, 2);
  } else {
    summary = await summarizeWithLLM(`Paper: ${paper.title} published in ${paper.venue}`, 2);
  }

  return cleanAndNormalizeMetadata({
    title: paper.title,
    authors: paper.authors?.map((a: any) => a.name) || [],
    year: paper.year,
    summary,
    url: paper.url,
    doi: paper.doi,
    source: 'Semantic Scholar',
    abstract: paper.abstract,
    contentType: 'PAPER',
  });
}

/**
 * Fetch paper by DOI
 */
async function fetchPaperByDoi(doi: string): Promise<ExtractedMetadata> {
  const lookupUrl = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=title,authors,year,abstract,venue,url,doi`;

  const response = await fetch(lookupUrl, {
    headers: {
      'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch paper by DOI: ${response.statusText}`);
  }

  const paper = await response.json();

  // Generate summary from abstract using LLM
  let summary = '';
  if (paper.abstract) {
    summary = await summarizeWithLLM(paper.abstract, 2);
  } else {
    summary = await summarizeWithLLM(`Paper: ${paper.title} published in ${paper.venue}`, 2);
  }

  return cleanAndNormalizeMetadata({
    title: paper.title,
    authors: paper.authors?.map((a: any) => a.name) || [],
    year: paper.year,
    summary,
    url: paper.url,
    doi: paper.doi,
    source: 'Semantic Scholar',
    abstract: paper.abstract,
    contentType: 'PAPER',
  });
}

/**
 * Fetch visible text from a URL
 */
async function fetchVisibleText(url: string): Promise<string> {
  // Use a text extraction service or implement basic scraping
  // For now, we'll use a simple approach with fetch
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();

  // Basic HTML tag removal - in production, use a proper library
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.slice(0, 10000); // Limit to 10k characters
}

/**
 * Generate a summary using LLM
 */
export async function summarizeWithLLM(text: string, maxSentences: number = 2): Promise<string> {
  const response = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      maxSentences,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate summary: ${response.statusText}`);
  }

  const data = await response.json();
  return data.summary;
}

/**
 * Clean and normalize metadata
 */
export function cleanAndNormalizeMetadata(metadata: any): ExtractedMetadata {
  // Normalize authors array
  const authors = Array.isArray(metadata.authors)
    ? metadata.authors.filter(Boolean).map(String)
    : typeof metadata.authors === 'string'
      ? [metadata.authors]
      : [];

  // Clean title - remove common suffixes
  let title = metadata.title || 'Untitled';
  title = title
    .replace(/\s*\|\s*.*$/, '') // Remove " | Site Name"
    .replace(/\s*-\s*.*$/, '') // Remove " - Site Name"
    .replace(/\s*[:]\s*.*$/, '') // Remove ": Subtitle"
    .trim();

  // Infer year if missing
  let year = metadata.year;
  if (!year && metadata.publishDate) {
    const match = metadata.publishDate.match(/\b(19|20)\d{2}\b/);
    if (match) year = parseInt(match[0]);
  }

  return {
    title,
    authors,
    year,
    summary: metadata.summary || metadata.abstract || '',
    url: metadata.url,
    doi: metadata.doi || '',
    source: metadata.source || '',
    abstract: metadata.abstract || '',
    contentType: metadata.contentType || 'ARTICLE',
  };
}
