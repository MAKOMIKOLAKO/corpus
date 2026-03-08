import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import HomePageClient from '@/components/HomePageClient';
import { ContentType, ReadingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function Home({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
    const contentType = typeof searchParams.contentType === 'string' ? searchParams.contentType : undefined;
    const readingStatus = typeof searchParams.readingStatus === 'string' ? searchParams.readingStatus : undefined;
    const year = typeof searchParams.year === 'string' ? searchParams.year : undefined;

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
    if (contentType) where.contentType = contentType as ContentType;
    if (readingStatus) where.readingStatus = readingStatus as ReadingStatus;
    if (year) where.year = parseInt(year, 10);

    const entries = await prisma.entry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border)] pb-6">
                <div>
                    <h2 className="text-xl font-medium tracking-tight">Your Library</h2>
                    <p className="text-sm text-[var(--muted-foreground)]">Browse and search your indexed knowledge.</p>
                </div>
                <a
                    href="/add"
                    className="bg-[var(--foreground)] text-[var(--background)] px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                    New Entry
                </a>
            </div>

            <HomePageClient
                initialSearch={search || ''}
                initialContentType={contentType || ''}
                initialReadingStatus={readingStatus || ''}
                initialYear={year || ''}
            />

            {entries.length === 0 ? (
                <div className="text-center py-24 rounded-lg bg-[var(--background)]">
                    <p className="text-[var(--muted-foreground)] mb-4">No entries found matching your criteria.</p>
                    <a href="/add" className="text-[var(--foreground)] font-medium underline underline-offset-4 hover:opacity-80 transition-opacity">Add your first entry</a>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {entries.map(entry => (
                        <a key={entry.id} href={`/entries/${entry.id}`} className="block group">
                            <div className="claude-card rounded-lg p-5 h-full hover:border-gray-400 dark:hover:border-gray-600 transition-colors flex flex-col gap-3">
                                <div>
                                    <h3 className="font-medium text-[var(--foreground)] text-[15px] leading-snug group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                                        {entry.title}
                                    </h3>
                                </div>

                                <p className="text-sm text-[var(--muted-foreground)] line-clamp-1">
                                    {entry.authors.join(', ')} {entry.year ? `(${entry.year})` : ''}
                                </p>

                                <div className="flex flex-wrap gap-2 mt-auto pt-4">
                                    <span className="text-[11px] px-2 py-0.5 rounded-sm bg-[var(--muted)] text-[var(--muted-foreground)] font-medium uppercase tracking-wider">
                                        {entry.contentType.replace('_', ' ')}
                                    </span>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-sm font-medium uppercase tracking-wider ${entry.readingStatus === 'READ' ? 'bg-black/5 dark:bg-white/5 text-[var(--foreground)]' :
                                        entry.readingStatus === 'READING' ? 'bg-[var(--primary)]/10 text-[var(--primary)]' :
                                            'bg-[var(--muted)] text-[var(--muted-foreground)]'
                                        }`}>
                                        {entry.readingStatus}
                                    </span>
                                </div>

                                {entry.autoKeywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {entry.autoKeywords.slice(0, 3).map((kw, idx) => (
                                            <span key={idx} className="text-[11px] text-[var(--muted-foreground)] px-1 rounded-sm bg-[var(--background)]">
                                                #{kw}
                                            </span>
                                        ))}
                                        {entry.autoKeywords.length > 3 && (
                                            <span className="text-[11px] px-1 text-[var(--muted-foreground)]">+{entry.autoKeywords.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
