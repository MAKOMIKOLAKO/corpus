import type { Metadata } from "next";
import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import LibraryPageWrapper from '@/components/LibraryPageWrapper';
import LibraryPageClient from './LibraryPageClient';
import { getCurrentUserId } from '@/lib/session';

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};


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

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true, entriesCount: true, personalCollectionsCount: true }
    });


    if (!user) return null;

    return (
        <LibraryPageWrapper>
            <div className="max-w-6xl mx-auto overflow-visible">
                <div className="space-y-8">
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2">
                            <h1 className="font-serif text-4xl font-medium text-content-primary leading-tight">your library</h1>
                            <p className="body-large text-content-secondary">browse and search your knowledge base</p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <a href="/add" className="flex-1 md:flex-none">
                                <button className="button-terracotta gap-2 w-full md:w-auto touch-manipulation inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all h-12 px-6 py-3">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                    add entry
                                </button>
                            </a>
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
                    />
                </div>
            </div>
        </LibraryPageWrapper>
    );
}
