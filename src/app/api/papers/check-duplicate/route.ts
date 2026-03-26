import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/app/api/api-key-middleware';
import { getCurrentUserId } from '@/lib/session';
import { prisma } from '@/lib/prismaWithRetry';

export async function GET(request: NextRequest) {
    try {
        // Validate API key
        const validation = await validateApiKey(request);
        if (!validation.valid) {
            return validation.response;
        }
        
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { searchParams } = new URL(request.url);
        const doi = searchParams.get('doi');
        const title = searchParams.get('title');
        
        if (!doi && !title) {
            return NextResponse.json(
                { error: 'Either DOI or title is required' },
                { status: 400 }
            );
        }
        
        let entry = null;
        
        // First check by DOI if provided
        if (doi) {
            entry = await prisma.entry.findFirst({
                where: {
                    userId,
                    doi: doi.trim().toLowerCase()
                },
                select: {
                    id: true,
                    title: true,
                    createdAt: true
                }
            });
        }
        
        // If no DOI match, check by title
        if (!entry && title) {
            entry = await prisma.entry.findFirst({
                where: {
                    userId,
                    title: {
                        contains: title.trim(),
                        mode: 'insensitive'
                    }
                },
                select: {
                    id: true,
                    title: true,
                    createdAt: true
                }
            });
        }
        
        if (entry) {
            return NextResponse.json({
                exists: true,
                entry: {
                    id: entry.id,
                    title: entry.title,
                    createdAt: entry.createdAt
                }
            });
        }
        
        return NextResponse.json({ exists: false });
        
    } catch (error) {
        console.error('Check duplicate error:', error);
        return NextResponse.json(
            { error: 'Failed to check for duplicates' },
            { status: 500 }
        );
    }
}
