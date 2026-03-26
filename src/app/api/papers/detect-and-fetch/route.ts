import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';

// Helper function to clean input
function cleanInput(input: string): string {
    return input.trim()
        .replace(/^(doi:|DOI:)/, '')
        .replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
}

// Helper function to detect DOI
function detectDOI(input: string): string | null {
    const doiPattern = /^10\.\d{4,}[\/.].+$/;
    return doiPattern.test(input) ? input : null;
}

// Helper function to detect ArXiv ID
function detectArXivID(input: string): string | null {
    const arxivPattern = /^\d{4}\.\d{4,5}(v\d+)?$/;
    const urlPattern = /arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(v\d+)?)/;
    
    if (arxivPattern.test(input)) {
        return input;
    }
    
    const urlMatch = input.match(urlPattern);
    return urlMatch ? urlMatch[1] : null;
}

// Helper function to detect PubMed ID
function detectPubMedID(input: string): string | null {
    const pmidPattern = /^\d{6,8}$/;
    const urlPattern = /pubmed\.ncbi\.nlm\.nih\.gov\/(?:entry\/)?(\d+)/;
    
    if (pmidPattern.test(input)) {
        return input;
    }
    
    const urlMatch = input.match(urlPattern);
    return urlMatch ? urlMatch[1] : null;
}

// Helper function to detect URL
function detectURL(input: string): string | null {
    return /^https?:\/\//.test(input) ? input : null;
}

// Helper function to detect citation string
function detectCitation(input: string): boolean {
    if (input.length < 40) return false;
    const citationPatterns = [
        /\(\d{4}\)/, // Parenthetical year
        /et\s+al\./i, // et al.
        /vol\.?\s*\d+/i, // Volume
        /pp?\.?\s*\d+/i, // Pages
        /\d{4}[\s-]*\d+/i, // Year-page
        /journal|proceedings|conference|symposium/i // Journal-like text
    ];
    return citationPatterns.some(pattern => pattern.test(input));
}

// Fetch from CrossRef
async function fetchFromCrossRef(doi: string) {
    try {
        const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        const item = data.message;
        
        const authors = item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean) || [];
        const year = item.published?.['date-parts']?.[0]?.[0] || null;
        const source = item['container-title']?.[0] || null;
        const abstract = item.abstract || null;
        
        return {
            title: item.title?.[0] || null,
            authors,
            year,
            abstract,
            source,
            doi: item.DOI || doi,
            url: item.URL || `https://doi.org/${doi}`,
            issn: item.ISSN?.[0] || null
        };
    } catch (error) {
        console.error('CrossRef error:', error);
        return null;
    }
}

// Fetch abstract from Semantic Scholar
async function fetchAbstractFromSemanticScholar(doi: string) {
    try {
        const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(doi)}?fields=abstract`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.abstract || null;
    } catch (error) {
        console.error('Semantic Scholar error:', error);
        return null;
    }
}

// Fetch from Unpaywall for open access
async function fetchFromUnpaywall(doi: string) {
    try {
        const response = await fetch(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=support@usecorpus.app`);
        if (!response.ok) return null;
        const data = await response.json();
        
        if (data.best_oa_location?.url_for_pdf) {
            return {
                oaUrl: data.best_oa_location.url_for_pdf,
                isOa: data.is_oa || false
            };
        }
        return null;
    } catch (error) {
        console.error('Unpaywall error:', error);
        return null;
    }
}

// Fetch from ArXiv
async function fetchFromArXiv(arxivId: string) {
    try {
        const response = await fetch(`http://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`);
        if (!response.ok) return null;
        
        const xml = await response.text();
        // Parse XML
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        
        const entry = doc.querySelector('entry');
        if (!entry) return null;
        
        const title = entry.querySelector('title')?.textContent?.trim() || null;
        const summary = entry.querySelector('summary')?.textContent?.trim() || null;
        const published = entry.querySelector('published')?.textContent;
        const year = published ? new Date(published).getFullYear() : null;
        
        const authors: string[] = [];
        entry.querySelectorAll('author name').forEach(name => {
            const authorName = name.textContent?.trim();
            if (authorName) authors.push(authorName);
        });
        
        // Extract DOI if present
        const doiLink = entry.querySelector('link[title="doi"]');
        const doi = doiLink?.getAttribute('href')?.replace('https://doi.org/', '') || null;
        
        return {
            title,
            authors,
            year,
            abstract: summary,
            source: 'ArXiv',
            doi,
            url: `https://arxiv.org/abs/${arxivId}`,
            pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`
        };
    } catch (error) {
        console.error('ArXiv error:', error);
        return null;
    }
}

// Fetch from PubMed
async function fetchFromPubMed(pmid: string) {
    try {
        // Fetch summary
        const summaryResponse = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`);
        if (!summaryResponse.ok) return null;
        const summaryData = await summaryResponse.json();
        const article = summaryData.result[pmid];
        if (!article) return null;
        
        // Fetch abstract
        const abstractResponse = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`);
        let abstract = null;
        if (abstractResponse.ok) {
            abstract = await abstractResponse.text();
            // Clean up abstract text
            abstract = abstract.replace(/^Abstract\s*\d+:?\s*/i, '').trim();
        }
        
        const authors = article.authors?.map((a: any) => a.name) || [];
        const year = article.pubdate ? parseInt(article.pubdate.split(' ')[0]) : null;
        
        return {
            title: article.title,
            authors,
            year,
            abstract,
            source: article.source || article.fulljournalname,
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        };
    } catch (error) {
        console.error('PubMed error:', error);
        return null;
    }
}

// Fetch HTML metadata
async function fetchHTMLMetadata(url: string) {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!response.ok) return null;
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const getMeta = (name: string) => {
            const meta = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
            return meta?.getAttribute('content')?.trim() || null;
        };
        
        const title = getMeta('citation_title') || getMeta('og:title') || doc.querySelector('title')?.textContent?.trim() || null;
        const authors = getMeta('citation_author') ? [getMeta('citation_author')] : [];
        const description = getMeta('description') || getMeta('og:description') || null;
        const doi = getMeta('citation_doi') || null;
        const source = getMeta('citation_journal_title') || getMeta('og:site_name') || null;
        
        return {
            title,
            authors,
            abstract: description,
            source,
            doi,
            url
        };
    } catch (error) {
        console.error('HTML fetch error:', error);
        return null;
    }
}

// Parse citation with Gemini
async function parseCitation(citation: string) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': process.env.GEMINI_API_KEY || ''
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Extract bibliographic metadata from this citation string. Return ONLY a JSON object with no explanation:\n{\n  "title": "string or null",\n  "authors": ["array of author names"],\n  "year": number or null,\n  "journal": "string or null",\n  "doi": "string or null"\n}\n\nCitation: ${citation}`
                    }]
                }]
            })
        });
        
        if (!response.ok) return null;
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;
        
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Citation parsing error:', error);
        return null;
    }
}

// Search CrossRef by title
async function searchCrossRefByTitle(title: string) {
    try {
        const response = await fetch(`https://api.crossref.org/works?query.title=${encodeURIComponent(title)}&rows=5&select=DOI,title,author,published,container-title,abstract`);
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.message?.items?.map((item: any) => ({
            doi: item.DOI,
            title: item.title?.[0],
            authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean) || [],
            year: item.published?.['date-parts']?.[0]?.[0],
            source: item['container-title']?.[0]
        })) || [];
    } catch (error) {
        console.error('CrossRef search error:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        // Validate API key
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }
        
        const { input } = await request.json();
        
        if (!input || typeof input !== 'string') {
            return NextResponse.json(
                { error: 'Input is required' },
                { status: 400 }
            );
        }
        
        const cleanedInput = cleanInput(input);
        let inputType: string = '';
        let metadata: any = null;
        let source: string = '';
        let responseType: 'single' | 'candidates' = 'single';
        let candidates: any[] = [];
        
        // Step 1: DOI Detection
        const doi = detectDOI(cleanedInput);
        if (doi) {
            inputType = 'doi';
            metadata = await fetchFromCrossRef(doi);
            if (metadata) {
                source = 'crossref';
                // Try to get abstract from Semantic Scholar if missing
                if (!metadata.abstract) {
                    const s2Abstract = await fetchAbstractFromSemanticScholar(doi);
                    if (s2Abstract) {
                        metadata.abstract = s2Abstract;
                        source += ' + semantic_scholar';
                    }
                }
                // Try Unpaywall for open access
                const oaInfo = await fetchFromUnpaywall(doi);
                if (oaInfo?.oaUrl) {
                    metadata.openAccessUrl = oaInfo.oaUrl;
                    source += ' + unpaywall';
                }
            }
        }
        
        // Step 2: ArXiv Detection
        if (!metadata && (inputType === '' || inputType === 'url')) {
            const arxivId = detectArXivID(input);
            if (arxivId) {
                inputType = 'arxiv';
                metadata = await fetchFromArXiv(arxivId);
                if (metadata) {
                    source = 'arxiv';
                }
            }
        }
        
        // Step 3: PubMed Detection
        if (!metadata && (inputType === '' || inputType === 'url')) {
            const pmid = detectPubMedID(input);
            if (pmid) {
                inputType = 'pubmed';
                metadata = await fetchFromPubMed(pmid);
                if (metadata) {
                    source = 'pubmed';
                }
            }
        }
        
        // Step 4: URL Detection
        if (!metadata && inputType === '') {
            const url = detectURL(input);
            if (url) {
                inputType = 'url';
                
                // Check for special URLs
                if (url.includes('arxiv.org')) {
                    const arxivId = detectArXivID(url);
                    if (arxivId) {
                        metadata = await fetchFromArXiv(arxivId);
                        if (metadata) source = 'arxiv';
                    }
                } else if (url.includes('pubmed.ncbi.nlm.nih.gov')) {
                    const pmid = detectPubMedID(url);
                    if (pmid) {
                        metadata = await fetchFromPubMed(pmid);
                        if (metadata) source = 'pubmed';
                    }
                } else if (url.includes('doi.org')) {
                    const extractedDoi = url.match(/doi\.org\/(.+)/)?.[1];
                    if (extractedDoi) {
                        metadata = await fetchFromCrossRef(extractedDoi);
                        if (metadata) {
                            source = 'crossref';
                            // Try to get abstract from Semantic Scholar
                            if (!metadata.abstract) {
                                const s2Abstract = await fetchAbstractFromSemanticScholar(extractedDoi);
                                if (s2Abstract) {
                                    metadata.abstract = s2Abstract;
                                    source += ' + semantic_scholar';
                                }
                            }
                        }
                    }
                } else {
                    // Generic URL - fetch HTML metadata
                    metadata = await fetchHTMLMetadata(url);
                    if (metadata) {
                        source = 'html';
                        // If we found a DOI in the HTML, try to fetch full metadata
                        if (metadata.doi) {
                            const doiMetadata = await fetchFromCrossRef(metadata.doi);
                            if (doiMetadata) {
                                metadata = { ...metadata, ...doiMetadata };
                                source = 'crossref';
                            }
                        }
                    }
                }
            }
        }
        
        // Step 5: Citation Detection
        if (!metadata && inputType === '') {
            if (detectCitation(input)) {
                inputType = 'citation';
                const citationData = await parseCitation(input);
                if (citationData) {
                    if (citationData.doi) {
                        // If we have a DOI, fetch full metadata
                        metadata = await fetchFromCrossRef(citationData.doi);
                        if (metadata) {
                            source = 'crossref';
                        }
                    } else if (citationData.title) {
                        // Search by title
                        candidates = await searchCrossRefByTitle(citationData.title);
                        if (candidates && candidates.length > 0) {
                            responseType = 'candidates';
                            return NextResponse.json({
                                responseType,
                                inputType,
                                candidates
                            });
                        }
                    }
                }
            }
        }
        
        // Step 6: Title Search Fallback
        if (!metadata && inputType === '') {
            inputType = 'title';
            candidates = await searchCrossRefByTitle(cleanedInput);
            if (candidates && candidates.length > 0) {
                responseType = 'candidates';
                return NextResponse.json({
                    responseType,
                    inputType,
                    candidates
                });
            }
        }
        
        // If we still don't have metadata, return error
        if (!metadata) {
            return NextResponse.json(
                { error: 'Could not find metadata for this input', inputType },
                { status: 422 }
            );
        }
        
        // Ensure content type is PAPER
        metadata.contentType = 'PAPER';
        
        return NextResponse.json({
            responseType,
            source,
            inputType,
            metadata
        });
        
    } catch (error) {
        console.error('Detect and fetch error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
