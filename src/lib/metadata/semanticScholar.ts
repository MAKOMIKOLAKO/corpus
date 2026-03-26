import type { SemanticScholarPaper, NormalizedMetadata } from './types';

const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1';

const FIELDS = 'paperId,title,abstract,year,authors,citationCount,fieldsOfStudy,venue,publicationDate,externalIds';

export async function fetchSemanticScholarByDOI(doi: string): Promise<SemanticScholarPaper | null> {
  try {
    const cleanDoi = doi.trim();
    const response = await fetch(
      `${SEMANTIC_SCHOLAR_API}/paper/DOI:${encodeURIComponent(cleanDoi)}?fields=${FIELDS}`,
      {
        headers: {
          'User-Agent': 'Corpus/1.0 (mailto:support@usecorpus.app)',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: SemanticScholarPaper = await response.json();
    return data;
  } catch (error) {
    console.error('Semantic Scholar DOI fetch error:', error);
    return null;
  }
}

export async function fetchSemanticScholarByArXiv(arxivId: string): Promise<SemanticScholarPaper | null> {
  try {
    const cleanId = arxivId.replace(/^arxiv:/i, '').trim();
    const response = await fetch(
      `${SEMANTIC_SCHOLAR_API}/paper/ARXIV:${encodeURIComponent(cleanId)}?fields=${FIELDS}`,
      {
        headers: {
          'User-Agent': 'Corpus/1.0 (mailto:support@usecorpus.app)',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: SemanticScholarPaper = await response.json();
    return data;
  } catch (error) {
    console.error('Semantic Scholar arXiv fetch error:', error);
    return null;
  }
}

export async function fetchSemanticScholarByPubMed(pubmedId: string): Promise<SemanticScholarPaper | null> {
  try {
    const cleanId = pubmedId.trim();
    const response = await fetch(
      `${SEMANTIC_SCHOLAR_API}/paper/PMID:${encodeURIComponent(cleanId)}?fields=${FIELDS}`,
      {
        headers: {
          'User-Agent': 'Corpus/1.0 (mailto:support@usecorpus.app)',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: SemanticScholarPaper = await response.json();
    return data;
  } catch (error) {
    console.error('Semantic Scholar PubMed fetch error:', error);
    return null;
  }
}

export async function searchSemanticScholarByTitle(title: string): Promise<SemanticScholarPaper | null> {
  try {
    const response = await fetch(
      `${SEMANTIC_SCHOLAR_API}/paper/search?query=${encodeURIComponent(title)}&fields=${FIELDS}&limit=5`,
      {
        headers: {
          'User-Agent': 'Corpus/1.0 (mailto:support@usecorpus.app)',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const papers: SemanticScholarPaper[] = data.data || [];

    if (papers.length === 0) {
      return null;
    }

    const normalizedSearchTitle = title.toLowerCase().trim();

    for (const paper of papers) {
      const normalizedPaperTitle = paper.title.toLowerCase().trim();
      const similarity = calculateTitleSimilarity(normalizedSearchTitle, normalizedPaperTitle);

      if (similarity > 0.85) {
        return paper;
      }
    }

    return null;
  } catch (error) {
    console.error('Semantic Scholar search error:', error);
    return null;
  }
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(title1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(title2.split(/\s+/).filter(w => w.length > 2));

  const intersection = new Set(Array.from(words1).filter(w => words2.has(w)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);

  if (union.size === 0) return 0;

  const jaccardSimilarity = intersection.size / union.size;

  const exactMatch = title1 === title2 ? 1.0 : 0;
  const containsMatch = title1.includes(title2) || title2.includes(title1) ? 0.5 : 0;

  return Math.max(jaccardSimilarity, exactMatch, containsMatch);
}

export function enrichMetadataWithSemanticScholar(
  baseMetadata: NormalizedMetadata,
  semanticScholarData: SemanticScholarPaper
): NormalizedMetadata {
  const enriched = { ...baseMetadata };

  if (!enriched.abstract && semanticScholarData.abstract) {
    enriched.abstract = semanticScholarData.abstract;
  }

  if (semanticScholarData.fieldsOfStudy && semanticScholarData.fieldsOfStudy.length > 0) {
    const existingTopics = new Set(enriched.topics);
    const newTopics = semanticScholarData.fieldsOfStudy.filter(field => !existingTopics.has(field));
    enriched.topics = [...enriched.topics, ...newTopics];
  }

  if (!enriched.source && semanticScholarData.venue) {
    enriched.source = semanticScholarData.venue;
  }

  enriched.metadata = {
    ...enriched.metadata,
    citationCount: semanticScholarData.citationCount,
    fieldsOfStudy: semanticScholarData.fieldsOfStudy || undefined,
    semanticScholarId: semanticScholarData.paperId,
    venue: semanticScholarData.venue || undefined,
    publicationDate: semanticScholarData.publicationDate || undefined,
  };

  return enriched;
}

export async function fetchAndEnrichWithSemanticScholar(
  baseMetadata: NormalizedMetadata,
  identifierType?: 'doi' | 'arxiv' | 'pubmed'
): Promise<NormalizedMetadata> {
  let semanticScholarData: SemanticScholarPaper | null = null;

  if (baseMetadata.doi) {
    semanticScholarData = await fetchSemanticScholarByDOI(baseMetadata.doi);
  } else if (identifierType === 'arxiv' && baseMetadata.metadata.arxivId) {
    semanticScholarData = await fetchSemanticScholarByArXiv(baseMetadata.metadata.arxivId);
  } else if (identifierType === 'pubmed' && baseMetadata.metadata.pubmedId) {
    semanticScholarData = await fetchSemanticScholarByPubMed(baseMetadata.metadata.pubmedId);
  }

  if (!semanticScholarData && baseMetadata.title) {
    semanticScholarData = await searchSemanticScholarByTitle(baseMetadata.title);
  }

  if (semanticScholarData) {
    return enrichMetadataWithSemanticScholar(baseMetadata, semanticScholarData);
  }

  return baseMetadata;
}
