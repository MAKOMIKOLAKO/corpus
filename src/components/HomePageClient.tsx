'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import { Search, Filter } from 'lucide-react';

export default function HomePageClient({
    initialSearch, initialContentType, initialReadingStatus, initialYear
}: {
    initialSearch: string; initialContentType: string; initialReadingStatus: string; initialYear: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState(initialSearch);
    const [contentType, setContentType] = useState(initialContentType);
    const [readingStatus, setReadingStatus] = useState(initialReadingStatus);
    const [year, setYear] = useState(initialYear);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            updateUrl();
        }, 400);
        return () => clearTimeout(timer);
    }, [search, contentType, readingStatus, year]);

    const updateUrl = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (contentType) params.set('contentType', contentType);
        if (readingStatus) params.set('readingStatus', readingStatus);
        if (year) params.set('year', year);

        startTransition(() => {
            router.push(`/?${params.toString()}`);
        });
    };

    return (
        <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <input
                    type="text"
                    placeholder="Search title, abstract, authors, keywords..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-shadow"
                />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="relative min-w-[130px]">
                    <select
                        value={contentType}
                        onChange={e => setContentType(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]"
                    >
                        <option value="">All Types</option>
                        <option value="PAPER">Paper</option>
                        <option value="BLOG">Blog</option>
                        <option value="ESSAY">Essay</option>
                        <option value="ARTICLE">Article</option>
                        <option value="POLICY_REPORT">Policy Report</option>
                        <option value="BOOK">Book</option>
                        <option value="OTHER">Other</option>
                    </select>
                    <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)] pointer-events-none" />
                </div>

                <div className="relative min-w-[130px]">
                    <select
                        value={readingStatus}
                        onChange={e => setReadingStatus(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]"
                    >
                        <option value="">All Statuses</option>
                        <option value="UNREAD">Unread</option>
                        <option value="READING">Reading</option>
                        <option value="READ">Read</option>
                    </select>
                    <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)] pointer-events-none" />
                </div>

                <div className="relative min-w-[100px]">
                    <input
                        type="number"
                        placeholder="Year"
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        className="w-full pl-3 pr-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>
            </div>
        </div>
    );
}
