'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import { Search, Filter } from 'lucide-react';

export default function HomePageClient({
    initialSearch, initialReadingStatus, initialYear, initialTopic, initialSortBy
}: {
    initialSearch: string; initialReadingStatus: string; initialYear: string; initialTopic: string; initialSortBy: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState(initialSearch);
    const [readingStatus, setReadingStatus] = useState(initialReadingStatus);
    const [year, setYear] = useState(initialYear);
    const [topic, setTopic] = useState(initialTopic);
    const [sortBy, setSortBy] = useState(initialSortBy);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            updateUrl();
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, readingStatus, year, topic, sortBy]);

    const updateUrl = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (readingStatus) params.set('readingStatus', readingStatus);
        if (year) params.set('year', year);
        if (topic) params.set('topic', topic);
        if (sortBy) params.set('sortBy', sortBy);

        startTransition(() => {
            router.push(`/library?${params.toString()}`);
        });
    };

    return (
        <div className="glass-card p-5 rounded-xl border border-border/50">
            <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder="search entries..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>

                {/* Filter Controls */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Filter className="w-3 h-3" />
                        <span>filters:</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                        {/* Reading Status Filter */}
                        <div className="relative">
                            <select
                                value={readingStatus}
                                onChange={e => setReadingStatus(e.target.value)}
                                className="w-full h-10 appearance-none pl-3 pr-8 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            >
                                <option value="">all statuses</option>
                                <option value="UNREAD">unread</option>
                                <option value="READING">reading</option>
                                <option value="READ">read</option>
                            </select>
                            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Year Filter */}
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="year"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                className="w-full h-10 pl-3 pr-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        {/* Sort Filter */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="w-full h-10 appearance-none pl-3 pr-8 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            >
                                <option value="newest">newest first</option>
                                <option value="oldest">oldest first</option>
                                <option value="title">title a-z</option>
                                <option value="title-desc">title z-a</option>
                                <option value="most-saved">most saved globally</option>
                            </select>
                            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Active Filters Display */}
                {(search || readingStatus || year || sortBy !== 'newest') && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <span>active:</span>
                        </div>
                        {search && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">
                                search: &quot;{search}&quot;
                            </span>
                        )}
                        {readingStatus && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md border border-border">
                                status: {readingStatus.toLowerCase()}
                            </span>
                        )}
                        {year && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md border border-border">
                                year: {year}
                            </span>
                        )}
                        {sortBy !== 'newest' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md border border-border">
                                sort: {sortBy.replace('-', ' ')}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
