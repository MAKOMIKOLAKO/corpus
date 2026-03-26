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

        // Validate DOI format
        if (!/^10\.\d{4,}[\/.].+$/.test(cleanDoi)) {
            return NextResponse.json({ error: 'Invalid DOI format' }, { status: 400 });
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

        // Fetch from CrossRef
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

        // If no abstract from CrossRef, try Semantic Scholar
        if (!metadata.abstract) {
            try {
                const s2Response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(cleanDoi)}?fields=abstract,openAccessPdf`);
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
