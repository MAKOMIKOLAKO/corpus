import type { Metadata } from "next";
import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import HomePageClient from '@/components/HomePageClient';
import EntryCard from '@/components/EntryCard';
import LibraryPageWrapper from '@/components/LibraryPageWrapper';
import LibraryPageClient from './LibraryPageClient';
import { ReadingStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getCurrentUserId } from '@/lib/session';

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

// Loading component for entries
function EntriesLoading() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="glass-card rounded-xl p-6 animate-pulse">
                    <div className="h-4 bg-[var(--muted)] rounded mb-3 w-3/4"></div>
                    <div className="h-3 bg-[var(--muted)] rounded mb-2 w-full"></div>
                    <div className="h-3 bg-[var(--muted)] rounded mb-4 w-2/3"></div>
                    <div className="flex gap-2 mb-4">
                        <div className="h-6 bg-[var(--muted)] rounded-full w-16"></div>
                        <div className="h-6 bg-[var(--muted)] rounded-full w-20"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-5 bg-[var(--muted)] rounded w-12"></div>
                        <div className="h-5 bg-[var(--muted)] rounded w-16"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export const dynamic = 'force-dynamic';

export default async function LibraryPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const userId = await getCurrentUserId();
    if (!userId) {
        return (
            <div className="max-w-6xl mx-auto p-8">
                <p className="text-muted-foreground">Please sign in to view your library.</p>
            </div>
        );
    }

    const params = searchParams || {};
    const search = typeof params.search === 'string' ? params.search : undefined;
    const readingStatus = typeof params.readingStatus === 'string' ? params.readingStatus : undefined;
    const year = typeof params.year === 'string' ? params.year : undefined;
    const topic = typeof params.topic === 'string' ? params.topic : undefined;
    const sortBy = typeof params.sortBy === 'string' ? params.sortBy : 'newest';

    const where: any = { userId };

    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { abstract: { contains: search, mode: 'insensitive' } },
            { authors: { hasSome: [search] } },
            { userKeywords: { hasSome: [search] } },
            { autoKeywords: { hasSome: [search] } },
            { topics: { hasSome: [search] } },
        ];
    }
    if (readingStatus) where.readingStatus = readingStatus as ReadingStatus;
    if (year) where.year = parseInt(year, 10);
    if (topic) where.topics = { hasSome: [topic] };

    // Determine sorting
    let orderBy: any = { createdAt: 'desc' }; // default: newest first
    if (sortBy === 'oldest') {
        orderBy = { createdAt: 'asc' };
    } else if (sortBy === 'title') {
        orderBy = { title: 'asc' };
    } else if (sortBy === 'title-desc') {
        orderBy = { title: 'desc' };
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, entriesCount: true, personalCollectionsCount: true }
    });

    const entries = await prisma.userEntry.findMany({
        where: {
            userId,
            globalEntry: search || year ? {
                AND: [
                    search ? {
                        OR: [
                            { title: { contains: search, mode: 'insensitive' as const } },
                            { abstract: { contains: search, mode: 'insensitive' as const } },
                            { authors: { hasSome: [search] } },
                        ]
                    } : {},
                    year ? { year: parseInt(year, 10) } : {},
                ].filter(condition => Object.keys(condition).length > 0)
            } : undefined,
            readingStatus: readingStatus ? readingStatus as ReadingStatus : undefined,
        },
        orderBy: sortBy === 'title' ? { globalEntry: { title: 'asc' } }
            : sortBy === 'title-desc' ? { globalEntry: { title: 'desc' } }
                : sortBy === 'oldest' ? { createdAt: 'asc' }
                    : { createdAt: 'desc' },
        take: 50,
        include: {
            globalEntry: {
                select: {
                    id: true,
                    title: true,
                    authors: true,
                    year: true,
                    abstract: true,
                    url: true,
                    doi: true,
                    source: true,
                    contentType: true,
                    metadata: true,
                    saveCount: true,
                }
            },
            userEntryCollections: {
                include: {
                    collection: true
                }
            }
        }
    });

    // Transform to match expected Entry interface
    const transformedEntries = entries.map((ue: any) => ({
        id: ue.id,
        title: ue.globalEntry.title,
        authors: ue.globalEntry.authors,
        year: ue.globalEntry.year,
        contentType: ue.globalEntry.contentType || 'OTHER',
        url: ue.globalEntry.url,
        doi: ue.globalEntry.doi,
        source: ue.globalEntry.source as 'MANUAL' | 'SMART_ALERT',
        metadata: ue.globalEntry.metadata,
        readingStatus: ue.readingStatus,
        createdAt: ue.createdAt,
        saveCount: ue.globalEntry.saveCount,
        collections: ue.userEntryCollections.map((uec: any) => ({
            id: uec.id,
            collection: {
                id: uec.collection.id,
                name: uec.collection.name
            }
        }))
    }));

    if (!user) return null;

    return (
        <LibraryPageWrapper>
            <div className="max-w-6xl mx-auto overflow-visible">
                <div className="space-y-8">
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-semibold tracking-tight">your library</h1>
                            <p className="text-sm text-muted-foreground">browse and search your knowledge base</p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Link href="/add" passHref className="flex-1 md:flex-none">
                                <Button variant="default" className="gap-2 w-full md:w-auto touch-manipulation">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    add entry
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <LibraryPageClient
                        user={{
                            plan: user.plan,
                            entriesCount: user.entriesCount || 0,
                            personalCollectionsCount: user.personalCollectionsCount || 0
                        }}
                        search={search}
                        readingStatus={readingStatus}
                        year={year}
                        topic={topic}
                        sortBy={sortBy}
                        entries={transformedEntries}
                    />
                </div>
            </div>
        </LibraryPageWrapper>
    );
}
