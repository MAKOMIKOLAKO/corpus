'use client';

import { useMemo, useState } from 'react';
import { BookPlus, Loader2, Search } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useApiKey } from '@/hooks/useApiKey';

type SearchResult = {
    key: string | null;
    editionKey?: string | null;
    title: string;
    authors: string[];
    first_publish_year: number | null;
    isbn13: string | null;
    cover: string | null;
};

type BookDetails = {
    title: string;
    authors: string[];
    publishers: string[];
    publishDate: string | null;
    numberOfPages: number | null;
    description: string | null;
    isbn13: string[];
    cover: string | null;
};

export default function QuickAddBookEntry() {
    const apiKey = useApiKey();

    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);

    const [selected, setSelected] = useState<SearchResult | null>(null);
    const [bookDetails, setBookDetails] = useState<BookDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const canSearch = query.trim().length > 2 && !isSearching;

    const selectedLabel = useMemo(() => {
        if (!selected) return '';
        const author = selected.authors?.[0] ? ` — ${selected.authors[0]}` : '';
        const year = selected.first_publish_year ? ` (${selected.first_publish_year})` : '';
        return `${selected.title}${author}${year}`;
    }, [selected]);

    const handleSearch = async () => {
        const q = query.trim();
        if (q.length < 3) return;

        setIsSearching(true);
        setError(null);
        setSuccess(false);
        setSelected(null);
        setBookDetails(null);

        try {
            const res = await fetch(`/api/openlibrary/search?title=${encodeURIComponent(q)}`, {
                headers: {
                    'x-api-key': apiKey,
                },
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'failed to search openlibrary');
            }

            const data = await res.json();
            setResults(Array.isArray(data?.results) ? data.results : []);
        } catch (e: any) {
            setError(e?.message || 'failed to search openlibrary');
        } finally {
            setIsSearching(false);
        }
    };

    const handlePick = async (r: SearchResult) => {
        setSelected(r);
        setBookDetails(null);
        setError(null);
        setSuccess(false);

        if (!r.isbn13 && !r.editionKey) {
            setError('this result has no isbn-13 or edition id; try another result');
            return;
        }

        setIsLoadingDetails(true);
        try {
            const qs = r.isbn13
                ? `isbn13=${encodeURIComponent(r.isbn13)}`
                : `editionKey=${encodeURIComponent(r.editionKey as string)}`;
            const res = await fetch(`/api/openlibrary/book?${qs}`, {
                headers: {
                    'x-api-key': apiKey,
                },
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || 'failed to load book details');
            }

            const data = await res.json();
            setBookDetails(data);
        } catch (e: any) {
            setError(e?.message || 'failed to load book details');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleCreate = async () => {
        if (!bookDetails) return;

        setIsCreating(true);
        setError(null);
        setSuccess(false);

        try {
            const detailAuthors = Array.isArray(bookDetails.authors) ? bookDetails.authors.filter(Boolean) : [];
            const fallbackAuthors = Array.isArray(selected?.authors) ? selected?.authors.filter(Boolean) : [];
            const authorsToUse = detailAuthors.length > 0 ? detailAuthors : fallbackAuthors;

            const publishYear = bookDetails.publishDate ? (bookDetails.publishDate.match(/\d{4}/)?.[0] ?? null) : null;
            const fallbackYear = typeof selected?.first_publish_year === 'number' ? selected.first_publish_year : null;
            const yearNumber = publishYear ? parseInt(publishYear, 10) : fallbackYear;

            const entryPayload: any = {
                title: bookDetails.title,
                authors: authorsToUse,
                year: typeof yearNumber === 'number' ? yearNumber.toString() : undefined,
                contentType: 'BOOK',
                url: null,
                doi: null,
                source: bookDetails.publishers?.[0] || null,
                abstract: bookDetails.description || null,
                publishers: bookDetails.publishers || [],
                publishDate: bookDetails.publishDate,
                numberOfPages: bookDetails.numberOfPages,
                description: bookDetails.description,
                isbn13: bookDetails.isbn13 || [],
                cover: bookDetails.cover,
                readingStatus: 'UNREAD',
                skipAI: true,
            };

            const response = await fetch('/api/entries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify(entryPayload),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                if (response.status === 409 && data?.duplicateEntry?.id) {
                    setError('duplicate book already exists. redirecting...');
                    setTimeout(() => {
                        window.location.href = `/entries/${data.duplicateEntry.id}`;
                    }, 1200);
                    return;
                }
                throw new Error(data?.error || 'failed to create entry');
            }

            setSuccess(true);
            setQuery('');
            setResults([]);

            setTimeout(() => {
                window.location.href = `/entries/${data.id}`;
            }, 800);
        } catch (e: any) {
            setError(e?.message || 'failed to create entry');
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
    };

    return (
        <div className="glass-card p-5 rounded-xl border border-border/50">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookPlus className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">quick add book</h3>
                        <p className="text-xs text-muted-foreground">search openlibrary by title and add as a book entry</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="search for a book title..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
                            disabled={isSearching || isCreating || isLoadingDetails}
                        />
                    </div>
                    <Button
                        onClick={handleSearch}
                        disabled={!canSearch || isCreating || isLoadingDetails}
                        size="sm"
                        className="h-10 px-4 rounded-lg font-medium transition-all"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'search'}
                    </Button>
                </div>

                {results.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden">
                        {results.map((r, idx) => (
                            <button
                                key={`${r.key ?? r.title}-${idx}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handlePick(r);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${selected?.isbn13 && r.isbn13 === selected.isbn13 ? 'bg-accent' : ''
                                    }`}
                            >
                                <div className="w-8 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                                    {r.cover ? (
                                        <Image src={r.cover} alt="" width={32} height={40} className="w-full h-full object-cover" />
                                    ) : null}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium truncate">{r.title}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {(r.authors?.[0] || 'unknown author')}
                                        {r.first_publish_year ? ` • ${r.first_publish_year}` : ''}
                                        {r.isbn13 ? ` • ISBN13 ${r.isbn13}` : r.editionKey ? ` • ${r.editionKey}` : ''}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {selected && (
                    <div className="text-xs text-muted-foreground">
                        selected: <span className="text-foreground">{selectedLabel}</span>
                    </div>
                )}

                {bookDetails && (
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground truncate">
                            ready to add: <span className="text-foreground">{bookDetails.title}</span>
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={isCreating}
                            size="sm"
                            className="h-9 px-4 rounded-lg font-medium"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? '✓' : 'add'}
                        </Button>
                    </div>
                )}

                {isLoadingDetails && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        loading book details...
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">!</span>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">✓</span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400">book entry added! redirecting...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
