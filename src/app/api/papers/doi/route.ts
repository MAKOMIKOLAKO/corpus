import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';

export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { doi } = await request.json();

        if (!doi || typeof doi !== 'string') {
            return NextResponse.json({ error: 'DOI is required' }, { status: 400 });
        }

        // Clean DOI input
        const cleanDoi = doi.trim()
            .replace(/^(doi:|DOI:)/, '')
            .replace(/^https?:\/\/(dx\.)?doi\.org\//, '');

        // Validate DOI format - accept standard DOIs (10.xxxx) or ArXiv IDs
        const isStandardDoi = /^10\.\d{4,}[\/.].+$/.test(cleanDoi);
        const isArXivId = /^\d{4}\.\d{4,5}(v\d+)?$/.test(cleanDoi);

        if (!isStandardDoi && !isArXivId) {
            return NextResponse.json({ error: 'Invalid DOI or ArXiv ID format' }, { status: 400 });
        }

        let metadata: any = {
            title: null,
            authors: [],
            year: null,
            abstract: null,
            source: null,
            doi: cleanDoi,
            url: null,
            openAccessUrl: null,
            contentType: 'PAPER',
            duplicate: null,
            metadataSources: []
        };

        // Fetch from CrossRef (for standard DOIs)
        if (isStandardDoi) {
            try {
                const crossrefResponse = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
                if (crossrefResponse.ok) {
                    const crossrefData = await crossrefResponse.json();
                    const item = crossrefData.message;

                    metadata.title = item.title?.[0] || null;
                    metadata.authors = item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean) || [];
                    metadata.year = item.published?.['date-parts']?.[0]?.[0] || null;
                    metadata.abstract = item.abstract || null;
                    metadata.source = item['container-title']?.[0] || null;
                    metadata.url = item.URL || `https://doi.org/${cleanDoi}`;
                    metadata.metadataSources.push('CrossRef');
                }
            } catch (error) {
                console.error('CrossRef error:', error);
            }
        }

        // Fetch from ArXiv API (for ArXiv IDs)
        if (isArXivId) {
            try {
                const arxivResponse = await fetch(`http://export.arxiv.org/api/query?id_list=${cleanDoi}`);
                if (arxivResponse.ok) {
                    const xmlText = await arxivResponse.text();
                    // Simple XML parsing - in production, you'd use a proper XML parser
                    const titleMatch = xmlText.match(/<title>(.*?)<\/title>/);
                    const authorMatches = xmlText.matchAll(/<name>(.*?)<\/name>/g);
                    const abstractMatch = xmlText.match(/<summary>(.*?)<\/summary>/);
                    const yearMatch = xmlText.match(/<published>(\d{4})/);

                    if (titleMatch) {
                        metadata.title = titleMatch[1];
                    }
                    if (authorMatches) {
                        metadata.authors = Array.from(authorMatches).map(match => match[1]);
                    }
                    if (yearMatch) {
                        metadata.year = parseInt(yearMatch[1]);
                    }
                    if (abstractMatch) {
                        metadata.abstract = abstractMatch[1];
                    }
                    metadata.source = 'arXiv';
                    metadata.url = `https://arxiv.org/abs/${cleanDoi}`;
                    metadata.doi = `arXiv:${cleanDoi}`; // Store as ArXiv ID
                    metadata.metadataSources.push('arXiv');
                }
            } catch (error) {
                console.error('ArXiv error:', error);
            }
        }

        // If no abstract from CrossRef, try Semantic Scholar (only for standard DOIs)
        if (!metadata.abstract && isStandardDoi) {
            try {
                const s2Response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(cleanDoi)}?fields=abstract,openAccessPdf`, {
                    headers: process.env.SEMANTIC_SCHOLAR_API_KEY ? {
                        'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY
                    } : {}
                });
                if (s2Response.ok) {
                    const s2Data = await s2Response.json();
                    if (s2Data.abstract) {
                        metadata.abstract = s2Data.abstract;
                        metadata.metadataSources.push('Semantic Scholar');
                    }
                    if (s2Data.openAccessPdf?.url) {
                        metadata.openAccessUrl = s2Data.openAccessPdf.url;
                    }
                }
            } catch (error) {
                console.error('Semantic Scholar error:', error);
            }
        }

        // Fetch from Unpaywall for open access link
        try {
            const unpaywallResponse = await fetch(`https://api.unpaywall.org/v2/${encodeURIComponent(cleanDoi)}?email=support@usecorpus.app`);
            if (unpaywallResponse.ok) {
                const unpaywallData = await unpaywallResponse.json();
                if (unpaywallData.best_oa_location?.url) {
                    metadata.openAccessUrl = unpaywallData.best_oa_location.url;
                    if (!metadata.metadataSources.includes('Unpaywall')) {
                        metadata.metadataSources.push('Unpaywall');
                    }
                }
            }
        } catch (error) {
            console.error('Unpaywall error:', error);
        }

        // Check for duplicate in user's library
        if (metadata.title && metadata.doi) {
            try {
                const { PrismaClient } = await import('@prisma/client');
                const prisma = new PrismaClient();

                const duplicate = await prisma.entry.findFirst({
                    where: {
                        userId,
                        doi: cleanDoi
                    },
                    select: {
                        id: true,
                        title: true,
                        createdAt: true
                    }
                });

                if (duplicate) {
                    metadata.duplicate = duplicate;
                }

                await prisma.$disconnect();
            } catch (error) {
                console.error('Duplicate check error:', error);
            }
        }

        // If we have at least a title, return the metadata
        if (metadata.title) {
            return NextResponse.json(metadata);
        }

        // Otherwise return error
        return NextResponse.json(
            { error: 'Could not find a paper with that DOI' },
            { status: 422 }
        );

    } catch (error) {
        console.error('DOI lookup error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
