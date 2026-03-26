export interface DetectedIdentifier {
  type: 'doi' | 'arxiv' | 'pubmed' | 'isbn' | null;
  value: string | null;
  confidence: number;
}

export function detectDOI(input: string): string | null {
  const doiPatterns = [
    /\b(10\.\d{4,}(?:\.\d+)*\/\S+)/i,
    /doi\.org\/(10\.\d{4,}(?:\.\d+)*\/\S+)/i,
    /dx\.doi\.org\/(10\.\d{4,}(?:\.\d+)*\/\S+)/i,
  ];

  for (const pattern of doiPatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return null;
}

export function detectArXivID(input: string): string | null {
  const arxivPatterns = [
    /arxiv\.org\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)/i,
    /\b([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)\b/,
    /arxiv\.org\/(?:abs|pdf)\/([a-z-]+\/\d{7}(?:v\d+)?)/i,
  ];

  for (const pattern of arxivPatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function detectPubMedID(input: string): string | null {
  const pubmedPatterns = [
    /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{7,8})/i,
    /ncbi\.nlm\.nih\.gov\/pubmed\/(\d{7,8})/i,
    /PMID:\s*(\d{7,8})/i,
  ];

  for (const pattern of pubmedPatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function detectISBN(input: string): string | null {
  const isbn13Pattern = /\b(97[89][-\s]?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d)\b/;
  const isbn10Pattern = /\b(\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?[\dX])\b/;

  let match = input.match(isbn13Pattern);
  if (match) {
    return match[1].replace(/[-\s]/g, '');
  }

  match = input.match(isbn10Pattern);
  if (match) {
    return match[1].replace(/[-\s]/g, '');
  }

  return null;
}

export function isAcademicPublisher(url: string): boolean {
  const academicDomains = [
    'nature.com',
    'science.org',
    'sciencedirect.com',
    'springer.com',
    'wiley.com',
    'ieee.org',
    'acm.org',
    'aaai.org',
    'arxiv.org',
    'biorxiv.org',
    'medrxiv.org',
    'pubmed.ncbi.nlm.nih.gov',
    'ncbi.nlm.nih.gov',
    'plos.org',
    'frontiersin.org',
    'mdpi.com',
    'tandfonline.com',
    'sagepub.com',
    'cambridge.org',
    'oxfordjournals.org',
    'oup.com',
    'cell.com',
    'thelancet.com',
    'bmj.com',
    'jama.jamanetwork.com',
    'nejm.org',
  ];

  const urlLower = url.toLowerCase();
  return academicDomains.some(domain => urlLower.includes(domain));
}

export async function detectIdentifier(input: string): Promise<DetectedIdentifier> {
  const cleanInput = input.trim();

  const doi = detectDOI(cleanInput);
  if (doi) {
    return { type: 'doi', value: doi, confidence: 1.0 };
  }

  const arxiv = detectArXivID(cleanInput);
  if (arxiv) {
    return { type: 'arxiv', value: arxiv, confidence: 1.0 };
  }

  const pubmed = detectPubMedID(cleanInput);
  if (pubmed) {
    return { type: 'pubmed', value: pubmed, confidence: 1.0 };
  }

  const isbn = detectISBN(cleanInput);
  if (isbn) {
    return { type: 'isbn', value: isbn, confidence: 0.95 };
  }

  return { type: null, value: null, confidence: 0 };
}
