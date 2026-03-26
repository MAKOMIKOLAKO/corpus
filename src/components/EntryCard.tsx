'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveScrollPositionForKey } from '@/hooks/useScrollPosition';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Check, ChevronDown, Copy, ExternalLink, Share, Trash2 } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import ShareEntryModal from '@/components/ShareEntryModal';

interface Entry {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
    contentType: string;
    url?: string | null;
    readingStatus: 'UNREAD' | 'READING' | 'READ';
    autoKeywords: string[];
    topics?: string[]; // Optional until Prisma client is regenerated
    createdAt: string | Date;
    collections?: {
        id: string;
        collection: {
            id: string;
            name: string;
        };
    }[];
}

const readingStatuses = [
    { value: 'UNREAD', label: 'Unread' },
    { value: 'READING', label: 'Reading' },
    { value: 'READ', label: 'Read' },
];

const statusVariant = (status: string) => {
    switch (status) {
        case 'READ': return 'success';
        case 'READING': return 'default';
        default: return 'secondary';
    }
};

const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));

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

export default function EntryCard({
    entry,
    scrollPositionKey = 'library',
    fromPath,
}: {
    entry: Entry;
    /** Session key for scroll restore (must match useScrollPosition on that page, e.g. `collection-${id}`). */
    scrollPositionKey?: string;
    /** Optional path to include in the from query parameter for back navigation */
    fromPath?: string;
}) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const [isTitleHovered, setIsTitleHovered] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(entry.readingStatus);
    const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
    const [didCopyUrl, setDidCopyUrl] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const apiKey = useApiKey();

    const [assignedCollectionIds, setAssignedCollectionIds] = useState<string[]>(
        (entry.collections ?? []).map((ec) => ec.collection.id)
    );
    const [currentCollectionId, setCurrentCollectionId] = useState<string | null>(
        entry.collections?.[0]?.collection?.id ?? null
    );
    const [currentCollectionName, setCurrentCollectionName] = useState<string>(
        entry.collections?.[0]?.collection?.name ?? 'no collection'
    );

    useEffect(() => {
        let cancelled = false;

        const fetchCollections = async () => {
            try {
                const response = await fetch('/api/collections', {
                    headers: {
                        'x-api-key': apiKey,
                    },
                });

                if (!response.ok) return;
                const data = await response.json();

                if (!cancelled && Array.isArray(data)) {
                    setCollections(
                        data
                            .filter((c: any) => c && typeof c.id === 'string' && typeof c.name === 'string')
                            .map((c: any) => ({ id: c.id, name: c.name }))
                    );
                }
            } catch {
                // ignore
            }
        };

        if (apiKey) fetchCollections();
        return () => {
            cancelled = true;
        };
    }, [apiKey]);

    const handleStatusChange = async (newStatus: typeof entry.readingStatus) => {
        if (newStatus === currentStatus) {
            setIsOpen(false);
            return;
        }

        setIsUpdating(true);
        try {
            const response = await fetch(`/api/entries/${entry.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({ readingStatus: newStatus }),
            });

            if (response.ok) {
                setCurrentStatus(newStatus);
            } else {
                console.error('Failed to update reading status');
                // Revert on error
                setCurrentStatus(currentStatus);
            }
        } catch (error) {
            console.error('Error updating reading status:', error);
            // Revert on error
            setCurrentStatus(currentStatus);
        } finally {
            setIsUpdating(false);
            setIsOpen(false);
        }
    };

    const displayTitle = entry.title.length > 140 ? `${entry.title.slice(0, 137)}...` : entry.title;

    const handleOpenUrl = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const url = entry.url?.trim();
        if (!url) return;

        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleCopyUrl = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const url = entry.url?.trim();
        if (!url) return;

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                const el = document.createElement('textarea');
                el.value = url;
                el.setAttribute('readonly', '');
                el.style.position = 'absolute';
                el.style.left = '-9999px';
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
            }

            setDidCopyUrl(true);
            window.setTimeout(() => setDidCopyUrl(false), 1200);
        } catch {
            // ignore
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowShareModal(true);
    };

    const removeFromAllCollections = async () => {
        const ids = Array.from(new Set(assignedCollectionIds));
        await Promise.all(
            ids.map((id) =>
                fetch(`/api/collections/${id}/entries/${entry.id}`, {
                    method: 'DELETE',
                    headers: {
                        'x-api-key': apiKey,
                    },
                })
            )
        );
    };

    const addToCollection = async (collectionId: string) => {
        await fetch(`/api/collections/${collectionId}/entries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify({ entryId: entry.id }),
        });
    };

    const handleCollectionChange = async (collectionId: string | null) => {
        if (collectionId === currentCollectionId) {
            setIsCollectionOpen(false);
            return;
        }

        setIsUpdatingCollection(true);
        try {
            await removeFromAllCollections();
            if (collectionId) {
                await addToCollection(collectionId);
            }

            setAssignedCollectionIds(collectionId ? [collectionId] : []);
            setCurrentCollectionId(collectionId);
            setCurrentCollectionName(
                collectionId ? collections.find((c) => c.id === collectionId)?.name ?? 'collection' : 'no collection'
            );
        } catch (error) {
            console.error('Error updating collection:', error);
        } finally {
            setIsUpdatingCollection(false);
            setIsCollectionOpen(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${entry.title}"?`)) return;

        try {
            const response = await fetch(`/api/entries/${entry.id}`, {
                method: 'DELETE',
                headers: {
                    'x-api-key': apiKey,
                },
            });

            if (response.ok) {
                router.refresh();
            } else {
                const errorData = await response.json();
                console.error('Delete failed:', errorData);
                alert(`Failed to delete entry: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Failed to delete entry');
        }
    };

    return (
        <>
            <Link
                href={`/entries/${entry.id}${fromPath ? `?from=${fromPath}` : ''}`}
                scroll={false}
                onClick={() => {
                    // Save scroll position for library page restoration
                    if (typeof window !== 'undefined') {
                        sessionStorage.setItem('lib_scroll', window.scrollY.toString());
                    }
                    // Also save using the existing hook for compatibility
                    saveScrollPositionForKey(scrollPositionKey);
                }}
            >
                <Card className="group h-full hover:shadow-lg transition-all duration-200 border-border/50 hover:border-foreground/20 overflow-visible">
                    <CardContent className="p-5 overflow-visible">
                        <div className="space-y-4">
                            {/* Header with title and metadata */}
                            <div className="space-y-3">
                                <div className="relative h-12">
                                    <CardTitle
                                        className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2 cursor-help"
                                        onMouseEnter={() => setIsTitleHovered(true)}
                                        onMouseLeave={() => setIsTitleHovered(false)}
                                    >
                                        {displayTitle}
                                    </CardTitle>

                                    {/* Custom tooltip for full title */}
                                    {isTitleHovered && entry.title.length > 50 && (
                                        <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-background border border-border rounded-lg shadow-lg z-[70] max-w-sm">
                                            <div className="text-sm font-medium text-foreground leading-relaxed">
                                                {entry.title}
                                            </div>
                                            <div className="absolute bottom-0 left-4 transform translate-y-full">
                                                <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-background"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground h-5">
                                    <span className="truncate">
                                        {entry.authors?.slice(0, 3).join(', ')}
                                        {entry.authors?.length > 3 && ` +${entry.authors.length - 3}`}
                                    </span>
                                    {entry.year && (
                                        <>
                                            <span className="text-border">•</span>
                                            <span>{entry.year}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Tags section - properly aligned */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* Collection Dropdown */}
                                <div className="relative min-w-0">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsCollectionOpen(!isCollectionOpen);
                                        }}
                                        className="h-6 w-full inline-flex items-center justify-between gap-2 text-[10px] tracking-wider rounded-sm font-medium px-2 py-1 border transition-colors border-border bg-background text-foreground hover:bg-accent"
                                        disabled={isUpdatingCollection}
                                    >
                                        <span className="truncate">{isUpdatingCollection ? '...' : currentCollectionName.toLowerCase()}</span>
                                        <ChevronDown className="w-3 h-3" />
                                    </button>

                                    {isCollectionOpen && (
                                        <div className="absolute top-full left-0 mt-1 z-[60] bg-background border border-border rounded-md shadow-lg min-w-[160px]">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCollectionChange(null);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${currentCollectionId === null ? 'bg-accent font-medium' : ''
                                                    }`}
                                            >
                                                no collection
                                            </button>
                                            {collections.map((c) => (
                                                <button
                                                    key={c.id}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleCollectionChange(c.id);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${c.id === currentCollectionId ? 'bg-accent font-medium' : ''
                                                        }`}
                                                >
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Reading Status Dropdown */}
                                <div className="relative min-w-0">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setIsOpen(!isOpen);
                                        }}
                                        className={`h-6 w-full inline-flex items-center justify-between gap-2 text-[10px] tracking-wider rounded-sm font-medium px-2 py-1 border transition-colors ${statusVariant(currentStatus) === 'success'
                                            ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30'
                                            : statusVariant(currentStatus) === 'default'
                                                ? 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]'
                                                : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/80'
                                            }`}
                                        disabled={isUpdating}
                                    >
                                        <span className="truncate">{isUpdating ? '...' : readingStatuses.find(s => s.value === currentStatus)?.label?.toLowerCase()}</span>
                                        <ChevronDown className="w-3 h-3" />
                                    </button>

                                    {isOpen && (
                                        <div className="absolute top-full left-0 mt-1 z-[60] bg-background border border-border rounded-md shadow-lg min-w-[120px]">
                                            {readingStatuses.map((status) => (
                                                <button
                                                    key={status.value}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleStatusChange(status.value as typeof entry.readingStatus);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${status.value === currentStatus ? 'bg-accent font-medium' : ''
                                                        }`}
                                                >
                                                    {status.label}
                                                </button>
                                            ))}
                                            <div className="border-t border-border">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDelete();
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 dark:text-red-400 transition-colors flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Keywords section */}
                            {entry.autoKeywords.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {entry.autoKeywords.slice(0, 3).map((kw, idx) => (
                                        <Badge key={idx} variant="outline" className="text-[10px] font-normal px-1.5 py-0 rounded-sm text-muted-foreground border-border bg-background">
                                            #{kw}
                                        </Badge>
                                    ))}
                                    {entry.autoKeywords.length > 3 && (
                                        <span className="text-[10px] px-1 text-muted-foreground self-center">+{entry.autoKeywords.length - 3}</span>
                                    )}
                                </div>
                            )}

                            {/* Topics section */}
                            {entry.topics && entry.topics.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {entry.topics.map((topic, idx) => (
                                        <Badge key={idx} variant="default" className="text-[10px] font-normal px-1.5 py-0 rounded-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-700">
                                            {topic}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Footer with date info */}
                            <div className="pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span>added {formatDate(entry.createdAt)}</span>
                                    <div className="flex items-center gap-2">
                                        {entry.url ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                                onClick={handleOpenUrl}
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </Button>
                                        ) : null}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                            onClick={handleShare}
                                        >
                                            <Share className="w-3 h-3" />
                                        </Button>
                                        {entry.url ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                                onClick={handleCopyUrl}
                                            >
                                                {didCopyUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* Share Modal */}
            <ShareEntryModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                entry={{
                    id: entry.id,
                    title: entry.title,
                    authors: entry.authors,
                    url: entry.url,
                }}
            />

            {/* Close dropdown when clicking outside */}
            {(isOpen || isCollectionOpen) && (
                <div
                    className="fixed inset-0 z-[50] bg-black/20 dark:bg-black/40"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsOpen(false);
                        setIsCollectionOpen(false);
                    }}
                />
            )}
        </>
    );
}
