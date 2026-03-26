import type { NormalizedMetadata } from './types';

export function cleanMetadata(metadata: NormalizedMetadata): NormalizedMetadata {
  const cleaned = { ...metadata };

  cleaned.title = cleanTitle(cleaned.title);
  cleaned.authors = cleanAuthors(cleaned.authors);
  cleaned.abstract = cleanAbstract(cleaned.abstract);
  cleaned.source = cleanSource(cleaned.source);
  cleaned.topics = deduplicateArray(cleaned.topics);

  if (!cleaned.year && cleaned.metadata.publicationDate) {
    cleaned.year = inferYearFromDate(cleaned.metadata.publicationDate);
  }

  return cleaned;
}

function cleanTitle(title: string): string {
  let cleaned = title.trim();

  const suffixPatterns = [
    / - Nature$/i,
    / - Science$/i,
    / - arXiv$/i,
    / \| Nature$/i,
    / \| Science$/i,
    / \| arXiv$/i,
    / - PubMed$/i,
    / - NCBI$/i,
    / - Springer$/i,
    / - Wiley$/i,
    / - IEEE Xplore$/i,
    / - ScienceDirect$/i,
  ];

  for (const pattern of suffixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

function cleanAuthors(authors: string[]): string[] {
  const cleaned = authors
    .map(author => author.trim())
    .filter(author => author.length > 0)
    .filter(author => !author.toLowerCase().includes('et al'))
    .map(author => {
      author = author.replace(/,\s*$/, '');
      author = author.replace(/\s+/g, ' ');
      return author;
    });

  return deduplicateArray(cleaned);
}

function cleanAbstract(abstract: string): string {
  let cleaned = abstract.trim();

  cleaned = cleaned.replace(/^Abstract:?\s*/i, '');
  cleaned = cleaned.replace(/^Summary:?\s*/i, '');

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

function cleanSource(source: string): string {
  let cleaned = source.trim();

  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.replace(/\.com$/i, '');
  cleaned = cleaned.replace(/\.org$/i, '');
  cleaned = cleaned.replace(/\.edu$/i, '');

  return cleaned;
}

function deduplicateArray(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

function inferYearFromDate(dateString: string): number | null {
  const yearMatch = dateString.match(/\d{4}/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    const currentYear = new Date().getFullYear();
    if (year >= 1900 && year <= currentYear + 1) {
      return year;
    }
  }
  return null;
}

export function computeConfidence(metadata: NormalizedMetadata, source: string): number {
  if (source === 'crossref' || source === 'arxiv' || source === 'pubmed') {
    return 1.0;
  }

  if (source === 'openlibrary') {
    return 0.95;
  }

  if (source === 'citation_tags') {
    return 0.9;
  }

  if (source === 'semantic_scholar_strong') {
    return 0.85;
  }

  if (source === 'opengraph') {
    return 0.7;
  }

  if (source === 'basic_html') {
    return 0.5;
  }

  return metadata.confidence || 0.5;
}

export function mergeMetadata(
  base: NormalizedMetadata,
  additional: Partial<NormalizedMetadata>,
  preferBase: boolean = true
): NormalizedMetadata {
  const merged = { ...base };

  if (!preferBase || !merged.title) {
    merged.title = additional.title || merged.title;
  }

  if (!preferBase || merged.authors.length === 0) {
    merged.authors = additional.authors || merged.authors;
  }

  if (!preferBase || !merged.year) {
    merged.year = additional.year ?? merged.year;
  }

  if (!preferBase || !merged.abstract) {
    merged.abstract = additional.abstract || merged.abstract;
  }

  if (!preferBase || !merged.doi) {
    merged.doi = additional.doi ?? merged.doi;
  }

  if (!preferBase || !merged.source) {
    merged.source = additional.source || merged.source;
  }

  if (additional.topics && additional.topics.length > 0) {
    merged.topics = deduplicateArray([...merged.topics, ...additional.topics]);
  }

  if (additional.metadata) {
    merged.metadata = {
      ...merged.metadata,
      ...additional.metadata,
    };
  }

  return merged;
}
