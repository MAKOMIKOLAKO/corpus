import { detectIdentifier, isAcademicPublisher } from './identifiers';
import { fetchPrimaryMetadata } from './primaryApis';
import { fetchAndEnrichWithSemanticScholar } from './semanticScholar';
import { extractMetadataFromURL, fetchHTML, extractHTMLMetadata } from './htmlExtraction';
import { cleanMetadata, computeConfidence, mergeMetadata } from './cleanup';
import { runLLMFallback, extractVisibleText } from './llmFallback';
import type { NormalizedMetadata } from './types';

export interface MetadataExtractionResult {
  success: boolean;
  metadata?: NormalizedMetadata;
  error?: string;
  source: string;
}

export async function buildEntryFromURL(
  input: string,
  geminiApiKey?: string
): Promise<MetadataExtractionResult> {
  const cleanInput = input.trim();

  if (!cleanInput) {
    return {
      success: false,
      error: 'Input is required',
      source: 'validation',
    };
  }

  const isUrl = cleanInput.startsWith('http://') || cleanInput.startsWith('https://');

  if (isUrl && !isAcademicPublisher(cleanInput)) {
    const hasIdentifier = await detectIdentifier(cleanInput);
    if (!hasIdentifier.type) {
      return {
        success: false,
        error: 'Only academic content is supported. Please provide a DOI, arXiv ID, PubMed ID, ISBN, or URL from a recognized academic publisher.',
        source: 'validation',
      };
    }
  }

  const [identifierResult, htmlContent] = await Promise.all([
    detectIdentifier(cleanInput),
    isUrl ? fetchHTML(cleanInput) : Promise.resolve(null),
  ]);

  let metadata: NormalizedMetadata | null = null;
  let dataSource = 'unknown';

  if (identifierResult.type && identifierResult.value) {
    metadata = await fetchPrimaryMetadata(identifierResult.type, identifierResult.value);

    if (metadata) {
      dataSource = identifierResult.type;
      const validSemanticScholarTypes: Array<'doi' | 'arxiv' | 'pubmed'> = ['doi', 'arxiv', 'pubmed'];
      const semanticScholarType = validSemanticScholarTypes.includes(identifierResult.type as any)
        ? (identifierResult.type as 'doi' | 'arxiv' | 'pubmed')
        : undefined;
      metadata = await fetchAndEnrichWithSemanticScholar(metadata, semanticScholarType);
    }
  }

  if (!metadata && htmlContent) {
    const htmlMeta = extractHTMLMetadata(htmlContent, cleanInput);

    if (htmlMeta.citationTitle) {
      metadata = {
        title: htmlMeta.citationTitle,
        authors: htmlMeta.citationAuthors || htmlMeta.authors,
        year: null,
        abstract: htmlMeta.ogDescription || htmlMeta.description,
        url: cleanInput,
        doi: htmlMeta.citationDoi || null,
        source: htmlMeta.citationJournalTitle || htmlMeta.ogSiteName || '',
        topics: [],
        metadata: {},
        confidence: 0.9,
      };
      dataSource = 'citation_tags';

      if (htmlMeta.citationPublicationDate) {
        const yearMatch = htmlMeta.citationPublicationDate.match(/\d{4}/);
        if (yearMatch) {
          metadata.year = parseInt(yearMatch[0]);
        }
      }

      if (metadata.doi) {
        metadata = await fetchAndEnrichWithSemanticScholar(metadata, 'doi');
      } else if (metadata.title) {
        metadata = await fetchAndEnrichWithSemanticScholar(metadata);
      }
    } else if (htmlMeta.ogTitle || htmlMeta.title) {
      metadata = {
        title: htmlMeta.ogTitle || htmlMeta.title,
        authors: htmlMeta.authors,
        year: null,
        abstract: htmlMeta.ogDescription || htmlMeta.description,
        url: cleanInput,
        doi: null,
        source: htmlMeta.ogSiteName || new URL(cleanInput).hostname,
        topics: [],
        metadata: {},
        confidence: htmlMeta.ogTitle ? 0.7 : 0.5,
      };
      dataSource = htmlMeta.ogTitle ? 'opengraph' : 'basic_html';

      if (metadata.title) {
        metadata = await fetchAndEnrichWithSemanticScholar(metadata);
      }
    }
  }

  if (!metadata) {
    return {
      success: false,
      error: 'Could not extract metadata from the provided source. Please ensure it is a valid academic paper, book, or recognized academic URL.',
      source: 'extraction_failed',
    };
  }

  metadata = cleanMetadata(metadata);

  const finalConfidence = computeConfidence(metadata, dataSource);
  metadata.confidence = finalConfidence;

  if (finalConfidence < 0.8 && geminiApiKey && htmlContent) {
    const visibleText = extractVisibleText(htmlContent);
    metadata = await runLLMFallback(metadata, visibleText, geminiApiKey);
    dataSource = `${dataSource}_+_llm`;
  }

  if (!metadata.title || metadata.title.length < 3) {
    return {
      success: false,
      error: 'Could not extract a valid title from the source.',
      source: dataSource,
    };
  }

  return {
    success: true,
    metadata,
    source: dataSource,
  };
}

export async function buildEntryFromDOI(
  doi: string,
  geminiApiKey?: string
): Promise<MetadataExtractionResult> {
  const cleanDoi = doi.trim();

  if (!cleanDoi) {
    return {
      success: false,
      error: 'DOI is required',
      source: 'validation',
    };
  }

  let metadata = await fetchPrimaryMetadata('doi', cleanDoi);

  if (!metadata) {
    return {
      success: false,
      error: 'Could not fetch metadata for the provided DOI from CrossRef.',
      source: 'crossref_failed',
    };
  }

  metadata = await fetchAndEnrichWithSemanticScholar(metadata, 'doi');

  metadata = cleanMetadata(metadata);

  const finalConfidence = computeConfidence(metadata, 'crossref');
  metadata.confidence = finalConfidence;

  return {
    success: true,
    metadata,
    source: 'crossref',
  };
}
