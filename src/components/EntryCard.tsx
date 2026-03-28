'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveScrollPositionForKey } from '@/hooks/useScrollPosition';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Check, ChevronDown, Copy, ExternalLink, Share, Trash2 } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import ShareEntryModal from '@/components/ShareEntryModal';

const CONTENT_TYPE_LABELS: Record<string, string> = {
    PAPER: 'Paper',
    BOOK: 'Book',
    ARTICLE: 'Article',
    BLOG: 'Blog',
    ESSAY: 'Essay',
    POLICY_REPORT: 'Policy Report',
    OTHER: 'Other',
};

function contentTypeLabel(contentType: string): string {
    return CONTENT_TYPE_LABELS[contentType] ?? contentType;
}

interface Entry {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
    contentType: string;
    url?: string | null;
    doi?: string | null;
    metadata?: {
        openAccessUrl?: string | null;
    } | null;
    readingStatus: 'UNREAD' | 'BACKLOG' | 'IN_PROGRESS' | 'READING' | 'COMPLETED' | 'READ' | 'DROPPED';
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
    { value: 'BACKLOG', label: 'Backlog' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'READING', label: 'Reading' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'READ', label: 'Read' },
    { value: 'DROPPED', label: 'Dropped' },
];

const statusVariant = (status: string) => {
    switch (status) {
        case 'READ':
        case 'COMPLETED':
            return 'success';
        case 'READING':
        case 'IN_PROGRESS':
            return 'default';
        case 'DROPPED': return 'destructive';
        case 'BACKLOG': return 'outline';
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
    selectionMode,
}: {
    entry: Entry;
    /** Session key for scroll restore (must match useScrollPosition on that page, e.g. `collection-${id}`). */
    scrollPositionKey?: string;
    /** Optional path to include in the from query parameter for back navigation */
    fromPath?: string;
    selectionMode?: {
        enabled: boolean;
        isSelected: boolean;
        onToggle: (id: string) => void;
    };
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
    const [didCopyDoi, setDidCopyDoi] = useState(false);
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

        const previousStatus = currentStatus;
        setCurrentStatus(newStatus);
        setIsOpen(false);
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

            if (!response.ok) {
                throw new Error('Failed to update reading status');
            }
        } catch (error) {
            console.error('Error updating reading status:', error);
            setCurrentStatus(previousStatus);
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
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

    const handleCopyDoi = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const doi = entry.doi?.trim();
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
            window.setTimeout(() => setDidCopyDoi(false), 1200);
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
            <div
                className="relative h-full"
                onClick={(e) => {
                    if (selectionMode?.enabled) {
                        e.preventDefault();
                        e.stopPropagation();
                        selectionMode.onToggle(entry.id);
                    }
                }}
            >
                {selectionMode?.enabled && (
                    <div className="absolute top-4 left-4 z-[40]">
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${selectionMode.isSelected ? 'bg-primary border-primary' : 'bg-background border-border group-hover:border-primary/50'}`}>
                            {selectionMode.isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                        </div>
                    </div>
                )}
                <Link
                    href={selectionMode?.enabled ? '#' : `/entries/${entry.id}${fromPath ? `?from=${fromPath}` : ''}`}
                    scroll={false}
                    onClick={(e) => {
                        if (selectionMode?.enabled) {
                            e.preventDefault();
                        } else {
                            saveScrollPositionForKey(scrollPositionKey);
                        }
                    }}
                    className={selectionMode?.enabled ? 'cursor-default' : ''}
                >
                    <Card className={`group h-full hover:shadow-lg transition-all duration-200 border-border/50 hover:border-foreground/20 overflow-visible ${selectionMode?.isSelected ? 'ring-2 ring-primary border-primary' : ''} ${selectionMode?.enabled ? 'pl-8' : ''}`}>
                        <CardContent className="p-5 overflow-visible">
                            <div className="space-y-4">
                                {/* Header with title and metadata */}
                                <div className="space-y-3">
                                    <div className="relative h-12">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CardTitle
                                                className="font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2 cursor-help flex-1"
                                                onMouseEnter={() => setIsTitleHovered(true)}
                                                onMouseLeave={() => setIsTitleHovered(false)}
                                            >
                                                {displayTitle}
                                            </CardTitle>
                                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-1.5 h-4 whitespace-nowrap border-border/50 text-muted-foreground font-bold">
                                                {contentTypeLabel(entry.contentType)}
                                            </Badge>
                                        </div>

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
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                                    {/* Collection Dropdown */}
                                    <div className="relative min-w-0">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsCollectionOpen(!isCollectionOpen);
                                            }}
                                            className="h-11 sm:h-6 w-full inline-flex items-center justify-between gap-2 text-[10px] tracking-wider rounded-sm font-medium px-4 sm:px-2 py-1 border transition-colors border-border bg-background text-foreground hover:bg-muted touch-manipulation"
                                            disabled={isUpdatingCollection}
                                        >
                                            <span className="truncate">{isUpdatingCollection ? '...' : currentCollectionName.toLowerCase()}</span>
                                            <ChevronDown className="w-4 h-4 sm:w-3 sm:h-3" />
                                        </button>

                                        {isCollectionOpen && (
                                            <div className="absolute top-full left-0 mt-1 z-[60] bg-background border border-border rounded-md shadow-lg min-w-[160px]">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleCollectionChange(null);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${currentCollectionId === null ? 'bg-muted font-medium' : ''
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
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${c.id === currentCollectionId ? 'bg-muted font-medium' : ''
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
                                            className={`h-11 sm:h-6 w-full inline-flex items-center justify-between gap-2 text-[10px] tracking-wider rounded-sm font-medium px-4 sm:px-2 py-1 border transition-colors touch-manipulation ${statusVariant(currentStatus) === 'success'
                                                ? 'border-blue-600 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900'
                                                : statusVariant(currentStatus) === 'default'
                                                    ? 'border-border bg-card text-foreground hover:bg-muted'
                                                    : 'border-border bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                                }`}
                                            disabled={isUpdating}
                                        >
                                            <span className="truncate">{isUpdating ? '...' : readingStatuses.find(s => s.value === currentStatus)?.label?.toLowerCase()}</span>
                                            <ChevronDown className="w-4 h-4 sm:w-3 sm:h-3" />
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
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${status.value === currentStatus ? 'bg-muted font-medium' : ''
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

                                {/* Footer with date info and paper links */}
                                <div className="pt-3 border-t border-border/50">
                                    <div className="flex flex-col gap-2">
                                        {/* Paper links section */}
                                        {(entry.url || entry.metadata?.openAccessUrl || entry.doi) && (
                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                {entry.metadata?.openAccessUrl && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 dark:text-green-400 touch-manipulation"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (entry.metadata?.openAccessUrl) {
                                                                window.open(entry.metadata.openAccessUrl, '_blank', 'noopener,noreferrer');
                                                            }
                                                        }}
                                                    >
                                                        Free PDF
                                                        <ExternalLink className="w-3 h-3 ml-1" />
                                                    </Button>
                                                )}
                                                {entry.url && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-muted-foreground hover:text-foreground touch-manipulation"
                                                        onClick={handleOpenUrl}
                                                    >
                                                        View Paper
                                                        <ExternalLink className="w-3 h-3 ml-1" />
                                                    </Button>
                                                )}
                                                {entry.doi && (
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <span className="text-xs">DOI: {entry.doi}</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground touch-manipulation"
                                                            onClick={handleCopyDoi}
                                                        >
                                                            {didCopyDoi ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Date and action buttons */}
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>added {formatDate(entry.createdAt)}</span>
                                            <div className="flex items-center gap-1 sm:gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-10 w-10 sm:h-6 sm:w-auto px-2 text-muted-foreground hover:text-foreground touch-manipulation"
                                                    onClick={handleShare}
                                                >
                                                    <Share className="w-5 h-5 sm:w-3 sm:h-3" />
                                                </Button>
                                                {entry.url && !entry.metadata?.openAccessUrl && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-10 w-10 sm:h-6 sm:w-auto px-2 text-muted-foreground hover:text-foreground touch-manipulation"
                                                        onClick={handleCopyUrl}
                                                    >
                                                        {didCopyUrl ? <Check className="w-5 h-5 sm:w-3 sm:h-3" /> : <Copy className="w-5 h-5 sm:w-3 sm:h-3" />}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

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
