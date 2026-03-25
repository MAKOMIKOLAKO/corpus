import type { Metadata } from "next";
import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import HomePageClient from '@/components/HomePageClient';
import EntryCard from '@/components/EntryCard';
import QuickAddSmartEntry from '@/components/QuickAddSmartEntry';
import LibraryPageWrapper from '@/components/LibraryPageWrapper';
import { ContentType, ReadingStatus } from '@prisma/client';
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    const contentType = typeof params.contentType === 'string' ? params.contentType : undefined;
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
    if (contentType) where.contentType = contentType as ContentType;
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

    const entries = await prisma.entry.findMany({
        where,
        orderBy,
        take: 20, // Limit to 20 entries for better performance
        include: {
            collections: {
                include: {
                    collection: true
                }
            }
        }
    });

    return (
        <LibraryPageWrapper>
            <div className="max-w-6xl mx-auto overflow-visible">
                <div className="space-y-8">
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-semibold tracking-tight">your library</h1>
                            <p className="text-sm text-muted-foreground">browse and search your indexed knowledge</p>
                        </div>
                        <Link href="/add" passHref>
                            <Button variant="default" className="gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                                new entry
                            </Button>
                        </Link>
                    </div>

                    {/* Quick Add Section */}
                    <QuickAddSmartEntry />

                    {/* Search and Filters */}
                    <HomePageClient
                        initialSearch={search || ''}
                        initialContentType={contentType || ''}
                        initialReadingStatus={readingStatus || ''}
                        initialYear={year || ''}
                        initialTopic={topic || ''}
                        initialSortBy={sortBy || 'newest'}
                    />

                    {/* Results Section */}
                    <div className="space-y-4">
                        {/* Results Header */}
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                {entries.length === 0
                                    ? 'no entries found'
                                    : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
                                }
                            </div>
                            {(search || contentType || readingStatus || year || sortBy !== 'newest') && (
                                <Link
                                    href="/library"
                                    className="text-xs text-primary hover:underline underline-offset-2"
                                >
                                    clear all filters
                                </Link>
                            )}
                        </div>

                        {/* Entry Grid */}
                        <Suspense fallback={<EntriesLoading />}>
                            {entries.length === 0 ? (
                                <div className="text-center py-24 rounded-xl bg-muted/30 border border-border/50">
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                                <path d="M2 17l10 5 10-5" />
                                                <path d="M2 12l10 5 10-5" />
                                            </svg>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-medium text-foreground">no entries found</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {search || contentType || readingStatus || year
                                                    ? 'try adjusting your search or filters'
                                                    : 'add your first entry to get started'
                                                }
                                            </p>
                                        </div>
                                        {!search && !contentType && !readingStatus && !year && (
                                            <Link href="/add" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-2">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 5v14M5 12h14" />
                                                </svg>
                                                add your first entry
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-visible">
                                    {entries.map(entry => (
                                        <EntryCard key={entry.id} entry={entry} />
                                    ))}
                                </div>
                            )}
                        </Suspense>
                    </div>
                </div>
            </div>
        </LibraryPageWrapper>
    );
}
