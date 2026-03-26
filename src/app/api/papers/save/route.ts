import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';

export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        if (!data.title || typeof data.title !== 'string') {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // Check entry limit for free users
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { plan: true }
            });

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Check entry count for free users
            if (user.plan === 'FREE') {
                const entryCount = await prisma.entry.count({
                    where: { userId }
                });

                if (entryCount >= 100) {
                    return NextResponse.json(
                        { error: 'You\'ve reached the 100 entry limit on the free plan. Upgrade to Pro for unlimited entries.' },
                        { status: 403 }
                    );
                }
            }
        } catch (error) {
            console.error('Plan check error:', error);
        }

        // Create the entry
        const entry = await prisma.entry.create({
            data: {
                title: data.title,
                authors: data.authors || [],
                year: data.year || null,
                abstract: data.abstract || null,
                source: data.source || null,
                doi: data.doi || null,
                url: data.url || null,
                contentType: 'PAPER',
                userId,
                readingStatus: data.readingStatus || 'UNREAD',
                notes: []
            },
            select: {
                id: true,
                title: true,
                createdAt: true
            }
        });

        // Update user's entry count - removed as field doesn't exist in schema

        // Fire and forget enrichment - REMOVED

        return NextResponse.json(entry);

    } catch (error) {
        console.error('Save paper error:', error);
        return NextResponse.json(
            { error: 'Failed to save paper' },
            { status: 500 }
        );
    }
}
