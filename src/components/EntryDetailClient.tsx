'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, Trash2, ChevronLeft, Calendar, FileText, Globe, BookOpen, Share2, Brain } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import { useEntry } from '@/hooks/useEntry';
import ShareEntryModal from '@/components/ShareEntryModal';
import SingleEntryCitationModal from '@/components/SingleEntryCitationModal';

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

export default function EntryDetailClient({ userEntryId }: { userEntryId: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { entry, loading, error, updateReadingStatus, deleteEntry } = useEntry(userEntryId);

    // Collections state
    const [entryCollections, setEntryCollections] = useState([]);
    const [availableCollections, setAvailableCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');
    const [isAddingToCollection, setIsAddingToCollection] = useState(false);

    // Share state
    const [showShareModal, setShowShareModal] = useState(false);
    const [showCitationModal, setShowCitationModal] = useState(false);

    const apiKey = useApiKey();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleBack = () => {
        if (!searchParams) {
            router.back();
            return;
        }
        const from = searchParams.get('from');
        if (from) {
            // If we have a 'from' parameter, navigate back to that page
            router.push(from);
        } else {
            // Otherwise use browser back
            router.back();
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

    // Collections handlers
    const handleAddToCollection = async () => {
        if (!selectedCollection) return;

        setIsAddingToCollection(true);
        try {
            const response = await fetch(`/api/collections/${selectedCollection}/entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({ userEntryId: entry?.id }),
            });

            if (response.ok) {
                setSelectedCollection('');
                fetchCollections();
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
                headers: {
                    'x-api-key': apiKey,
                },
            });

            if (response.ok) {
                fetchCollections();
            } else {
                const error = await response.json();
                alert(`Failed to remove from collection: ${error.error}`);
            }
        } catch (error) {
            console.error('Error removing from collection:', error);
            alert('Failed to remove from collection');
        }
    };

    const fetchCollections = async () => {
        try {
            // Get all collections
            const collectionsResponse = await fetch('/api/collections');
            if (collectionsResponse.ok) {
                const allCollections = await collectionsResponse.json();
                setAvailableCollections(allCollections);
            }

            // Get entry's collections (this would need a new API endpoint or modify existing one)
            // For now, we'll simulate this
            setEntryCollections([]);
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    };

    useEffect(() => {
        fetchCollections();
    }, []);

    // Notes functionality removed - using collections instead

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
                    <button onClick={() => router.push('/library')} className="text-primary hover:underline">
                        Back to Library
                    </button>
                </div>
            </div>
        );
    }

    const handleStatusChange = (newStatus: string) => {
        updateReadingStatus(newStatus);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <button onClick={handleBack} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <div className="space-y-8">
                <div className="rounded-2xl p-6 md:p-8 flex flex-col relative overflow-hidden border border-[var(--border)] bg-card">
                    <div className="absolute top-0 right-0 p-4 flex gap-1 sm:gap-2">
                        <button onClick={() => setShowCitationModal(true)} className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-md transition-colors touch-manipulation" title="Cite this entry">
                            <FileText className="w-5 h-5 sm:w-4 sm:h-4" />
                        </button>
                        <button onClick={() => setShowShareModal(true)} className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-md transition-colors touch-manipulation" title="Share Entry">
                            <Share2 className="w-5 h-5 sm:w-4 sm:h-4" />
                        </button>
                        <button onClick={handleDelete} className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors touch-manipulation" title="Remove Entry">
                            <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                        </button>
                    </div>

                    <div className="flex gap-2 items-center mb-4 text-xs font-semibold tracking-wider">
                        <select
                            value={entry.readingStatus}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className={`px-2.5 py-1 rounded-lg border-0 cursor-pointer ${entry.readingStatus === 'COMPLETED' ? 'bg-accent/10 text-accent' :
                                entry.readingStatus === 'IN_PROGRESS' ? 'bg-surface-sunken text-content-primary' :
                                    'bg-muted text-content-secondary'
                                }`}
                        >
                            <option value="UNREAD">Unread</option>
                            <option value="BACKLOG">Backlog</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="DROPPED">Dropped</option>
                        </select>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-serif font-medium leading-tight text-[var(--foreground)] mb-2 pr-32 sm:pr-16">{entry.title}</h1>

                    {/* Global Entry Context */}
                    <div className="flex items-center gap-2 text-sm text-content-tertiary mb-4">
                        <span>{entry.saveCount} {entry.saveCount === 1 ? 'person has' : 'people have'} saved this</span>
                        {entry.doi && (
                            <span>· DOI: {entry.doi}</span>
                        )}
                    </div>

                    <p className="text-base sm:text-lg text-[var(--muted-foreground)] mb-6 font-medium">
                        {entry.authors.join(', ')}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-[var(--muted)]/30 p-4 rounded-xl border border-[var(--border)]/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-[var(--muted-foreground)] uppercase">added</span>
                                <span className="font-medium text-sm">{formatDate(entry.createdAt)}</span>
                            </div>
                        </div>
                        {entry.year && (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                    <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-[var(--muted-foreground)] uppercase">year</span>
                                    <span className="font-medium text-sm">{entry.year}</span>
                                </div>
                            </div>
                        )}
                        {entry.source && (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                    <BookOpen className="w-4 h-4 text-[var(--muted-foreground)]" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-[var(--muted-foreground)] uppercase">Source</span>
                                    <span className="font-medium text-sm line-clamp-1">{entry.source}</span>
                                </div>
                            </div>
                        )}
                        {entry.doi && (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                    <FileText className="w-4 h-4 text-[var(--muted-foreground)]" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-[var(--muted-foreground)] uppercase">DOI</span>
                                    <a href={`https://doi.org/${entry.doi}`} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-[var(--primary)] hover:underline flex items-center gap-1 line-clamp-1">
                                        {entry.doi}
                                    </a>
                                </div>
                            </div>
                        )}
                        {entry.url && (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--background)] flex items-center justify-center border border-[var(--border)]">
                                    <Globe className="w-4 h-4 text-[var(--muted-foreground)]" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-[var(--muted-foreground)] uppercase">Link</span>
                                    <a href={entry.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-[var(--primary)] hover:underline flex items-center gap-1 line-clamp-1">
                                        Open URL <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Smart Alert Notice */}
                    {entry.addedVia === 'SMART_ALERT' && (
                        <div className="mb-6 p-4 rounded-lg bg-accent-muted border border-border-strong">
                            <div className="flex items-start gap-3">
                                <Brain className="w-5 h-5 text-accent mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm text-content-primary font-medium mb-1">
                                        This paper was automatically added by a Smart Alert
                                    </p>
                                    <p className="text-xs text-content-secondary">
                                        Corpus found this paper based on your research interests and added it to your library.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {entry.abstract && (
                        <div className="mb-6">
                            <h3 className="font-medium text-sm uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Abstract</h3>
                            <p className="text-[var(--foreground)] leading-relaxed text-sm md:text-base opacity-90">{entry.abstract}</p>
                        </div>
                    )}

                </div>

                <div className="rounded-2xl p-6 md:p-8 border border-[var(--border)] bg-card">
                    <h3 className="text-xl font-serif font-medium mb-6 flex items-center gap-2">
                        Collections
                        <span className="bg-[var(--muted)] text-[var(--muted-foreground)] text-xs px-2 py-0.5 rounded-full font-medium">{entryCollections?.length || 0}</span>
                    </h3>

                    <div className="space-y-4 mb-6">
                        {Array.isArray(entryCollections) && entryCollections.length > 0 ? (
                            entryCollections.map((collection: any) => {
                                return (
                                    <div key={collection.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-sm mb-1">{collection.name}</h4>
                                            {collection.description && (
                                                <p className="text-xs text-[var(--muted-foreground)] mb-2">{collection.description}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleRemoveFromCollection(collection.id)}
                                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm ml-2"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-[var(--muted-foreground)] text-sm italic">
                                Not in any collections yet.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <select
                            value={selectedCollection}
                            onChange={(e) => setSelectedCollection(e.target.value)}
                            className="flex-1 px-3 py-3 sm:py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)] touch-manipulation"
                        >
                            <option value="">Select a collection...</option>
                            {Array.isArray(availableCollections) && availableCollections.map((collection: any) => (
                                <option key={collection.id} value={collection.id}>
                                    {collection.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleAddToCollection}
                            disabled={!selectedCollection || isAddingToCollection}
                            className="bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-3 sm:py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity w-full sm:w-auto touch-manipulation"
                        >
                            {isAddingToCollection ? 'Adding...' : 'Add to Collection'}
                        </button>
                    </div>
                </div>

                {/* Share Modal */}
                {showShareModal && entry && (
                    <ShareEntryModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        entry={{
                            id: entry.id,
                            title: entry.title,
                            authors: entry.authors,
                            url: entry.url
                        }}
                    />
                )}

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
        </div>
    );
}
