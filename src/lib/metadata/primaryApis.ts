import type {
  NormalizedMetadata,
  CrossRefMetadata,
  ArXivMetadata,
  PubMedMetadata,
  OpenLibraryMetadata,
} from './types';

export async function fetchCrossRefMetadata(doi: string): Promise<NormalizedMetadata | null> {
  try {
    const cleanDoi = doi.trim();
    const response = await fetch(`https://api.crossref.org/works/${cleanDoi}`, {
      headers: {
        'User-Agent': 'Corpus/1.0 (mailto:support@usecorpus.app)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const item: CrossRefMetadata = data.message;

    const authors = item.author?.map((a) => `${a.given || ''} ${a.family || ''}`.trim()) || [];
    const year = item.issued?.['date-parts']?.[0]?.[0] || item.created?.['date-parts']?.[0]?.[0] || null;
    const source = item['container-title']?.[0] || item.publisher || '';
    const title = item.title?.[0] || '';
    const abstract = item.abstract || '';
    const topics = item.subject || [];

    return {
      title,
      authors,
      year,
      abstract,
      url: item.URL || `https://doi.org/${cleanDoi}`,
      doi: cleanDoi,
      source,
      topics,
      metadata: {},
      confidence: 1.0,
    };
  } catch (error) {
    console.error('CrossRef fetch error:', error);
    return null;
  }
}

export async function fetchArXivMetadata(arxivId: string): Promise<NormalizedMetadata | null> {
  try {
    const cleanId = arxivId.replace(/^arxiv:/i, '').trim();
    const response = await fetch(`http://export.arxiv.org/api/query?id_list=${cleanId}`);

    if (!response.ok) {
      return null;
    }

    const xmlText = await response.text();
    
    const titleMatch = xmlText.match(/<title>([^<]+)<\/title>/);
    const summaryMatch = xmlText.match(/<summary>([^<]+)<\/summary>/);
    const publishedMatch = xmlText.match(/<published>([^<]+)<\/published>/);
    const categoryMatches = xmlText.match(/<category term="([^"]+)"/g);
    const doiMatch = xmlText.match(/doi:([^<\s]+)/i);
    
    const authorMatches = xmlText.match(/<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/g);
    const authors = authorMatches
      ? authorMatches.map((author) => {
          const nameMatch = author.match(/<name>([^<]+)<\/name>/);
          return nameMatch ? nameMatch[1] : '';
        }).filter(Boolean)
      : [];

    const title = titleMatch ? titleMatch[1].trim() : '';
    const abstract = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : '';
    const publishedDate = publishedMatch ? publishedMatch[1] : '';
    const year = publishedDate ? new Date(publishedDate).getFullYear() : null;
    
    const categories = categoryMatches
      ? categoryMatches.map((cat) => {
          const match = cat.match(/term="([^"]+)"/);
          return match ? match[1] : '';
        }).filter(Boolean)
      : [];

    const doi = doiMatch ? doiMatch[1] : null;

    return {
      title,
      authors,
      year,
      abstract,
      url: `https://arxiv.org/abs/${cleanId}`,
      doi,
      source: 'arXiv',
      topics: categories,
      metadata: {
        arxivId: cleanId,
      },
      confidence: 1.0,
    };
  } catch (error) {
    console.error('arXiv fetch error:', error);
    return null;
  }
}

export async function fetchPubMedMetadata(pubmedId: string): Promise<NormalizedMetadata | null> {
  try {
    const cleanId = pubmedId.trim();
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${cleanId}&retmode=json`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const article = data.result?.[cleanId];

    if (!article) {
      return null;
    }

    const title = article.title || '';
    const authors = article.authors?.map((a: any) => a.name) || [];
    const year = article.pubdate ? parseInt(article.pubdate.split(' ')[0]) : null;
    const source = article.fulljournalname || article.source || '';
    
    const detailResponse = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${cleanId}&retmode=xml`
    );
    
    let abstract = '';
    let doi = null;
    
    if (detailResponse.ok) {
      const xmlText = await detailResponse.text();
      const abstractMatch = xmlText.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/);
      abstract = abstractMatch ? abstractMatch[1].trim() : '';
      
      const doiMatch = xmlText.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
      doi = doiMatch ? doiMatch[1] : null;
    }

    return {
      title,
      authors,
      year,
      abstract,
      url: `https://pubmed.ncbi.nlm.nih.gov/${cleanId}/`,
      doi,
      source,
      topics: [],
      metadata: {
        pubmedId: cleanId,
      },
      confidence: 1.0,
    };
  } catch (error) {
    console.error('PubMed fetch error:', error);
    return null;
  }
}

export async function fetchOpenLibraryMetadata(isbn: string): Promise<NormalizedMetadata | null> {
  try {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&format=json&jscmd=data`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const bookData: OpenLibraryMetadata = data[`ISBN:${cleanIsbn}`];

    if (!bookData) {
      return null;
    }

    const title = bookData.title || '';
    const authors = bookData.authors?.map((a) => a.name) || [];
    const publishDate = bookData.publish_date || '';
    const year = publishDate ? parseInt(publishDate.match(/\d{4}/)?.[0] || '') : null;
    const publishers = bookData.publishers || [];
    const source = publishers.length > 0 ? publishers[0] : '';
    
    let abstract = '';
    if (bookData.description) {
      abstract = typeof bookData.description === 'string' 
        ? bookData.description 
        : bookData.description.value;
    }

    const topics = bookData.subjects || [];

    return {
      title,
      authors,
      year,
      abstract,
      url: `https://openlibrary.org/isbn/${cleanIsbn}`,
      doi: null,
      source,
      topics: topics.slice(0, 10),
      metadata: {
        isbn: cleanIsbn,
        publisher: source,
      },
      confidence: 0.95,
    };
  } catch (error) {
    console.error('Open Library fetch error:', error);
    return null;
  }
}

export async function fetchPrimaryMetadata(
  identifierType: 'doi' | 'arxiv' | 'pubmed' | 'isbn',
  identifierValue: string
): Promise<NormalizedMetadata | null> {
  switch (identifierType) {
    case 'doi':
      return fetchCrossRefMetadata(identifierValue);
    case 'arxiv':
      return fetchArXivMetadata(identifierValue);
    case 'pubmed':
      return fetchPubMedMetadata(identifierValue);
    case 'isbn':
      return fetchOpenLibraryMetadata(identifierValue);
    default:
      return null;
  }
}
