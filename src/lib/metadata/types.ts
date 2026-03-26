export interface NormalizedMetadata {
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  url: string;
  doi: string | null;
  source: string;
  topics: string[];
  metadata: {
    citationCount?: number;
    fieldsOfStudy?: string[];
    semanticScholarId?: string;
    venue?: string;
    publicationDate?: string;
    isbn?: string;
    publisher?: string;
    arxivId?: string;
    pubmedId?: string;
  };
  confidence: number;
}

export interface CrossRefMetadata {
  title?: string[];
  author?: Array<{ given?: string; family?: string }>;
  issued?: { 'date-parts'?: number[][] };
  created?: { 'date-parts'?: number[][] };
  'container-title'?: string[];
  publisher?: string;
  abstract?: string;
  DOI?: string;
  URL?: string;
  subject?: string[];
}

export interface ArXivMetadata {
  id: string;
  title: string;
  authors: Array<{ name: string }>;
  published: string;
  summary: string;
  categories: string[];
  doi?: string;
}

export interface PubMedMetadata {
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  doi?: string;
  pmid: string;
}

export interface OpenLibraryMetadata {
  title: string;
  authors?: Array<{ name: string }>;
  publish_date?: string;
  publishers?: string[];
  isbn_13?: string[];
  isbn_10?: string[];
  subjects?: string[];
  description?: string | { value: string };
}

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract: string | null;
  year: number | null;
  authors: Array<{ name: string; authorId?: string }>;
  citationCount: number;
  fieldsOfStudy: string[] | null;
  venue: string | null;
  publicationDate: string | null;
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
    PubMed?: string;
  };
}

export interface HTMLMetadata {
  title: string;
  description: string;
  authors: string[];
  citationTitle?: string;
  citationAuthors?: string[];
  citationPublicationDate?: string;
  citationJournalTitle?: string;
  citationDoi?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogSiteName?: string;
}
