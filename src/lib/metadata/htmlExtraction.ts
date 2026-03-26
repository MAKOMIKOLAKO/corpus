import * as cheerio from 'cheerio';
import type { HTMLMetadata, NormalizedMetadata } from './types';

export async function fetchHTML(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error('HTML fetch error:', error);
    return null;
  }
}

export function extractHTMLMetadata(html: string, url: string): HTMLMetadata {
  const $ = cheerio.load(html);

  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim() || '';

  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim();
  const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();

  const citationTitle = $('meta[name="citation_title"]').attr('content')?.trim();
  const citationJournalTitle = $('meta[name="citation_journal_title"]').attr('content')?.trim();
  const citationPublicationDate = $('meta[name="citation_publication_date"]').attr('content')?.trim() ||
                                   $('meta[name="citation_date"]').attr('content')?.trim();
  const citationDoi = $('meta[name="citation_doi"]').attr('content')?.trim();

  const citationAuthors: string[] = [];
  $('meta[name="citation_author"]').each((_, el) => {
    const author = $(el).attr('content')?.trim();
    if (author) {
      citationAuthors.push(author);
    }
  });

  const authorMeta = $('meta[name="author"]').attr('content')?.trim() ||
                     $('meta[property="article:author"]').attr('content')?.trim();
  const authors = authorMeta ? [authorMeta] : [];

  return {
    title,
    description,
    authors,
    citationTitle,
    citationAuthors: citationAuthors.length > 0 ? citationAuthors : undefined,
    citationPublicationDate,
    citationJournalTitle,
    citationDoi,
    ogTitle,
    ogDescription,
    ogSiteName,
  };
}

export function htmlMetadataToNormalized(
  htmlMeta: HTMLMetadata,
  url: string
): NormalizedMetadata {
  const title = htmlMeta.citationTitle || htmlMeta.ogTitle || htmlMeta.title;
  const abstract = htmlMeta.ogDescription || htmlMeta.description;
  const authors = htmlMeta.citationAuthors || htmlMeta.authors;
  const source = htmlMeta.citationJournalTitle || htmlMeta.ogSiteName || new URL(url).hostname;
  const doi = htmlMeta.citationDoi || null;

  let year: number | null = null;
  if (htmlMeta.citationPublicationDate) {
    const yearMatch = htmlMeta.citationPublicationDate.match(/\d{4}/);
    if (yearMatch) {
      year = parseInt(yearMatch[0]);
    }
  }

  const confidence = htmlMeta.citationTitle ? 0.9 : (htmlMeta.ogTitle ? 0.7 : 0.5);

  return {
    title,
    authors,
    year,
    abstract,
    url,
    doi,
    source,
    topics: [],
    metadata: {},
    confidence,
  };
}

export async function extractMetadataFromURL(url: string): Promise<NormalizedMetadata | null> {
  const html = await fetchHTML(url);
  if (!html) {
    return null;
  }

  const htmlMeta = extractHTMLMetadata(html, url);
  return htmlMetadataToNormalized(htmlMeta, url);
}
