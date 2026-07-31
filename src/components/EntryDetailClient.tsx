'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useEntry } from '@/hooks/useEntry';
import SingleEntryCitationModal from '@/components/SingleEntryCitationModal';
import { ContentRenderer } from '@/components/ui/content-renderer';

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
        return 'today';
    } else if (diffInDays === 1) {
        return 'yesterday';
    } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        const years = Math.floor(diffInDays / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
    }
};

type EntryCollection = { collectionId: string; name: string; addedAt: string };

export default function EntryDetailClient({ userEntryId }: { userEntryId: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { entry, loading, error, updateReadingStatus, deleteEntry } = useEntry(userEntryId);

    // Collections state
    const [entryCollections, setEntryCollections] = useState<EntryCollection[]>([]);
    const [availableCollections, setAvailableCollections] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedCollection, setSelectedCollection] = useState('');
    const [isAddingToCollection, setIsAddingToCollection] = useState(false);

    const [showCitationModal, setShowCitationModal] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [didCopyDoi, setDidCopyDoi] = useState(false);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Keep the displayed collection pills in sync with the entry's own collection membership
    useEffect(() => {
        if (entry) setEntryCollections(entry.collections || []);
    }, [entry]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 2200);
        return () => clearTimeout(t);
    }, [toast]);

    const handleBack = () => {
        if (!searchParams) {
            router.back();
            return;
        }
        const from = searchParams.get('from');
        if (from) {
            router.push(from);
        } else {
            router.push('/library');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Remove from your library? This only removes it from your library — the entry remains in Corpus for other users who have saved it.')) return;

        try {
            await deleteEntry();
            router.push('/library');
        } catch (e) {
            console.error(e);
            alert('Failed to remove entry');
        }
    };

    const handleCopyDoi = async () => {
        const doi = entry?.doi?.trim();
        if (!doi) return;

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(doi);
            } else {
                const el = document.createElement('textarea');
                el.value = doi;
                el.setAttribute('readonly', '');
                el.style.position = 'absolute';
                el.style.left = '-9999px';
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
            }
            setDidCopyDoi(true);
            setToast('DOI copied to clipboard');
            window.setTimeout(() => setDidCopyDoi(false), 1200);
        } catch {
            // ignore
        }
    };

    // Collections handlers
    const fetchCollections = async () => {
        try {
            const collectionsResponse = await fetch('/api/collections');
            if (collectionsResponse.ok) {
                const data = await collectionsResponse.json();
                const flat = [
                    ...(Array.isArray(data.owned) ? data.owned : []),
                    ...(Array.isArray(data.member) ? data.member : []),
                ];
                setAvailableCollections(flat);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    const handleAddToCollection = async () => {
        if (!selectedCollection) return;

        setIsAddingToCollection(true);
        try {
            const response = await fetch(`/api/collections/${selectedCollection}/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userEntryId: entry?.id }),
            });

            if (response.ok) {
                const added = availableCollections.find((c) => c.id === selectedCollection);
                if (added) {
                    setEntryCollections((prev) => [...prev, { collectionId: added.id, name: added.name, addedAt: new Date().toISOString() }]);
                }
                setSelectedCollection('');
            } else {
                const error = await response.json();
                alert(`Failed to add to collection: ${error.error}`);
            }
        } catch (error) {
            console.error('Error adding to collection:', error);
            alert('Failed to add to collection');
        } finally {
            setIsAddingToCollection(false);
        }
    };

    const handleRemoveFromCollection = async (collectionId: string) => {
        if (!confirm('Remove this entry from the collection?')) return;

        try {
            const response = await fetch(`/api/collections/${collectionId}/entries/${entry?.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setEntryCollections((prev) => prev.filter((c) => c.collectionId !== collectionId));
            } else {
                const error = await response.json();
                alert(`Failed to remove from collection: ${error.error}`);
            }
        } catch (error) {
            console.error('Error removing from collection:', error);
            alert('Failed to remove from collection');
        }
    };

    const handleStatusChange = (newStatus: string) => {
        updateReadingStatus(newStatus);
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/4"></div>
                    <div className="h-12 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-64 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !entry) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold mb-4">Entry not found</h1>
                    <p className="text-muted-foreground mb-4">This entry is no longer in your library.</p>
                    <button onClick={() => router.push('/library')} className="text-accent hover:underline">
                        Back to Library
                    </button>
                </div>
            </div>
        );
    }

    const metaItems = [
        { label: 'Added', node: <span className="text-[13px] text-muted-foreground truncate">{formatDate(entry.createdAt)}</span> },
        entry.year
            ? { label: 'Year', node: <span className="text-[13px] text-muted-foreground truncate">{entry.year}</span> }
            : null,
        entry.doi
            ? {
                  label: 'DOI',
                  node: (
                      <button
                          onClick={handleCopyDoi}
                          title="Click to copy"
                          className="text-[13px] text-accent hover:opacity-75 transition-opacity truncate text-left"
                      >
                          {didCopyDoi ? 'Copied!' : entry.doi}
                      </button>
                  ),
              }
            : null,
        entry.url
            ? {
                  label: 'Source',
                  node: (
                      <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[13px] text-accent hover:opacity-75 transition-opacity truncate"
                      >
                          View Source →
                      </a>
                  ),
              }
            : null,
    ].filter(Boolean) as { label: string; node: React.ReactNode }[];

    const statusPillClass =
        entry.readingStatus === 'COMPLETED'
            ? 'bg-muted text-[#7a8e86] line-through'
            : entry.readingStatus === 'IN_PROGRESS'
              ? 'bg-transparent text-accent font-medium'
              : 'bg-muted text-[#7a8e86]';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-card text-[13px] px-4 py-2 rounded-lg z-50 shadow-lg">
                    {toast}
                </div>
            )}

            <div className="max-w-[720px] mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={handleBack} className="inline-flex items-center gap-1.5 text-[13px] text-[#7a8e86] hover:text-foreground transition-colors">
                        <ChevronLeft className="w-4 h-4" /> Library
                    </button>

                    <select
                        value={entry.readingStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className={`text-xs px-2.5 py-0.5 rounded-full border-0 cursor-pointer appearance-none text-center ${statusPillClass}`}
                    >
                        <option value="UNREAD">Unread</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </div>

                <h1
                    className={`font-serif text-[32px] font-medium leading-[1.20] text-foreground mb-3.5 ${entry.readingStatus === 'COMPLETED' ? 'line-through decoration-1' : ''}`}
                >
                    {entry.title}
                </h1>

                <p className="text-[15px] leading-[1.60] text-muted-foreground mb-1.5">{entry.authors.join(', ')}</p>

                {entry.source && (
                    <p className="text-[13px] text-[#7a8e86] italic mb-9">
                        {entry.source}
                        {entry.year ? `, ${entry.year}` : ''}
                    </p>
                )}
                {!entry.source && <div className="mb-9" />}

                {/* Metadata strip — desktop/tablet row */}
                <div className="hidden sm:flex items-stretch bg-card border border-border rounded-lg overflow-hidden mb-10">
                    {metaItems.map((item, i) => (
                        <Fragment key={item.label}>
                            {i > 0 && <div className="w-px bg-border" />}
                            <div className="flex flex-col gap-0.5 px-4 py-2.5 flex-1 min-w-0">
                                <span className="text-[10px] uppercase tracking-[0.05em] text-[#7a8e86]">{item.label}</span>
                                {item.node}
                            </div>
                        </Fragment>
                    ))}
                </div>

                {/* Metadata strip — mobile 2x2 grid */}
                <div className="grid grid-cols-2 sm:hidden bg-card border border-border rounded-lg overflow-hidden mb-10">
                    {metaItems.map((item, i) => {
                        const total = metaItems.length;
                        const isRightCol = i % 2 === 0 && i + 1 < total;
                        const isLastRow = i >= total - (total % 2 === 0 ? 2 : 1);
                        return (
                            <div
                                key={item.label}
                                className={`flex flex-col gap-0.5 px-3.5 py-2.5 ${isRightCol ? 'border-r border-border' : ''} ${!isLastRow ? 'border-b border-border' : ''}`}
                            >
                                <span className="text-[10px] uppercase tracking-[0.05em] text-[#7a8e86]">{item.label}</span>
                                {item.node}
                            </div>
                        );
                    })}
                </div>

                {/* Abstract */}
                <div className="mb-12">
                    <div className="text-[10px] uppercase tracking-[0.5px] text-[#7a8e86] mb-4">Abstract</div>
                    {entry.abstract ? (
                        <ContentRenderer
                            text={entry.abstract}
                            className="font-serif text-base leading-[1.70] text-foreground"
                            style={{ textWrap: 'pretty' as any }}
                        />
                    ) : (
                        <p className="font-serif text-base leading-[1.70] text-[#7a8e86] italic">No abstract available.</p>
                    )}
                </div>

                {/* Collections */}
                <div className="bg-card border border-border rounded-xl p-6 mb-10">
                    <div className="font-serif text-xl font-medium text-foreground mb-4">Collections</div>

                    {entryCollections.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-5">
                            {entryCollections.map((collection) => (
                                <span
                                    key={collection.collectionId}
                                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full border border-accent bg-background text-[13px] text-muted-foreground"
                                >
                                    {collection.name}
                                    <button
                                        onClick={() => handleRemoveFromCollection(collection.collectionId)}
                                        title="Remove"
                                        className="text-accent hover:opacity-60 transition-opacity leading-none px-0.5"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-[#7a8e86] italic mb-5">Not in any collections yet.</p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
                        <select
                            value={selectedCollection}
                            onChange={(e) => setSelectedCollection(e.target.value)}
                            className="flex-1 h-9 px-2.5 border border-border rounded-lg bg-card text-[13px] text-muted-foreground focus:outline-none focus:border-accent"
                        >
                            <option value="" disabled>
                                Add to a collection...
                            </option>
                            {availableCollections.map((collection) => (
                                <option key={collection.id} value={collection.id}>
                                    {collection.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleAddToCollection}
                            disabled={!selectedCollection || isAddingToCollection}
                            className="h-9 px-4 bg-accent text-accent-foreground rounded-lg text-[13px] hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
                        >
                            {isAddingToCollection ? 'Adding...' : 'Add to Collection'}
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pb-12 text-[13px]">
                    <button onClick={handleDelete} className="text-[#7a8e86] hover:text-red-600 transition-colors">
                        Delete entry
                    </button>
                    <span className="text-border">·</span>
                    <button onClick={() => setShowCitationModal(true)} className="text-[#7a8e86] hover:text-foreground transition-colors">
                        Copy citation
                    </button>
                    {entry.readingStatus !== 'COMPLETED' && (
                        <>
                            <span className="text-border">·</span>
                            <button onClick={() => handleStatusChange('COMPLETED')} className="text-[#7a8e86] hover:text-accent transition-colors">
                                Mark as completed
                            </button>
                        </>
                    )}
                </div>
            </div>

            {showCitationModal && entry && (
                <SingleEntryCitationModal
                    isOpen={showCitationModal}
                    onClose={() => setShowCitationModal(false)}
                    entry={{
                        id: entry.id,
                        title: entry.title,
                        authors: entry.authors,
                        year: entry.year,
                        source: entry.source,
                        url: entry.url,
                        doi: entry.doi,
                        abstract: entry.abstract,
                        isbn: entry.isbn,
                        metadata: entry.metadata,
                    }}
                />
            )}
        </div>
    );
}
