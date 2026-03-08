import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ContentType, ReadingStatus } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const contentType = searchParams.get('contentType');
        const readingStatus = searchParams.get('readingStatus');
        const year = searchParams.get('year');

        const where: any = {};

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { abstract: { contains: search, mode: 'insensitive' } },
                { authors: { hasSome: [search] } },
                { userKeywords: { hasSome: [search] } },
                { autoKeywords: { hasSome: [search] } },
            ];
        }
        if (contentType) {
            where.contentType = contentType as ContentType;
        }
        if (readingStatus) {
            where.readingStatus = readingStatus as ReadingStatus;
        }
        if (year) {
            where.year = parseInt(year, 10);
        }

        const entries = await prisma.entry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error('Error fetching entries:', error);
        return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const entry = await prisma.entry.create({
            data: {
                title: body.title,
                authors: body.authors || [],
                year: body.year ? parseInt(body.year, 10) : null,
                contentType: body.contentType || 'PAPER',
                url: body.url || null,
                doi: body.doi || null,
                source: body.source || null,
                abstract: body.abstract || null,
                autoKeywords: body.autoKeywords || [],
                userKeywords: body.userKeywords || [],
                summary: body.summary || null,
                notes: body.notes || [],
                readingStatus: body.readingStatus || 'UNREAD',
            },
        });
        return NextResponse.json(entry, { status: 201 });
    } catch (error) {
        console.error('Error creating entry:', error);
        return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }
}
