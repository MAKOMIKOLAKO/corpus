'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveScrollPositionForKey } from '@/hooks/useScrollPosition';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Check, ChevronDown, Copy, ExternalLink, Share, Trash2, Brain } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import ShareEntryModal from '@/components/ShareEntryModal';
import { formatRelativeTime } from '@/lib/dateUtils';
import { useTimezone } from '@/hooks/useTimezone';
import { FlatEntry } from '@/types/entry';


const readingStatuses = [
    { value: 'UNREAD', label: 'Unread' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
];

const statusVariant = (status: string) => {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'IN_PROGRESS':
            return 'default';
        default: return 'secondary';
    }
};

const formatDate = (date: string | Date) => {
    const timezone = useTimezone();
    return formatRelativeTime(date, timezone);
};

export default function EntryCard({
    entry,
    scrollPositionKey = 'library',
    fromPath,
    onDelete,
    selectionMode,
}: {
    entry: FlatEntry;
    /** Session key for scroll restore (must match useScrollPosition on that page, e.g. `collection-${id}`). */
    scrollPositionKey?: string;
    /** Optional path to include in the from query parameter for back navigation */
    fromPath?: string;
    /** Optional callback for removing this entry from parent-managed state after successful delete */
    onDelete?: (userEntryId: string) => void;
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
    const collectionDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [currentStatus, setCurrentStatus] = useState(entry.readingStatus);
    const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
    const [didCopyUrl, setDidCopyUrl] = useState(false);
    const [didCopyDoi, setDidCopyDoi] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const apiKey = useApiKey();

    const [assignedCollectionIds, setAssignedCollectionIds] = useState<string[]>(
        (entry.collections ?? []).map((c) => c.collectionId)
    );
    const [currentCollectionId, setCurrentCollectionId] = useState<string | null>(
        entry.collections?.[0]?.collectionId ?? null
    );
    const [currentCollectionName, setCurrentCollectionName] = useState<string>(
        entry.collections?.[0]?.name ?? 'no collection'
    );

    useEffect(() => {
        let cancelled = false;

        const fetchCollections = async () => {
            try {
                const response = await fetch('/api/collections', {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) return;
                const data = await response.json();

                if (!cancelled && data) {
                    // Handle the API response structure: { owned: [...], member: [...] }
                    const allCollections = [];

                    if (Array.isArray(data.owned)) {
                        allCollections.push(...data.owned);
                    }

                    if (Array.isArray(data.member)) {
                        allCollections.push(...data.member);
                    }

                    const filteredCollections = allCollections
                        .filter((c: any) => c && typeof c.id === 'string' && typeof c.name === 'string')
                        .map((c: any) => ({ id: c.id, name: c.name }));

                    console.log('Collections loaded:', filteredCollections);
                    setCollections(filteredCollections);
                }
            } catch (error) {
                console.error('Error fetching collections:', error);
            }
        };

        if (apiKey) fetchCollections();
        return () => {
            cancelled = true;
        };
    }, [apiKey]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // Check if click is outside all dropdown containers
            const outsideCollection = !collectionDropdownRef.current?.contains(target);
            const outsideStatus = !statusDropdownRef.current?.contains(target);

            if (outsideCollection) setIsCollectionOpen(false);
            if (outsideStatus) setIsOpen(false);
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    const handleStatusChange = async (newStatus: FlatEntry['readingStatus']) => {
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
                },
                body: JSON.stringify({ readingStatus: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to update reading status');
            }

            toast.success('Status updated successfully');
        } catch (error) {
            console.error('Error updating reading status:', error);
            setCurrentStatus(previousStatus);
            toast.error(error instanceof Error ? error.message : 'Failed to update status');
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
                        'Content-Type': 'application/json',
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
            },
            body: JSON.stringify({ userEntryId: entry.id }),
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
                const collection = collections.find((c) => c.id === collectionId);
                toast.success(`Added to "${collection?.name}"`);
            } else {
                toast.success('Removed from collection');
            }

            setAssignedCollectionIds(collectionId ? [collectionId] : []);
            setCurrentCollectionId(collectionId);
            setCurrentCollectionName(
                collectionId ? collections.find((c) => c.id === collectionId)?.name ?? 'collection' : 'no collection'
            );
        } catch (error) {
            console.error('Error updating collection:', error);
            toast.error('Failed to update collection');
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
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                onDelete?.(entry.id);
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
                ref={cardRef}
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
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${selectionMode.isSelected ? 'bg-accent border-accent' : 'bg-background border-border group-hover:border-accent/50'}`}>
                            {selectionMode.isSelected && <Check className="w-4 h-4 text-accent-foreground" />}
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
                    <Card className={`group h-full border border-border bg-card transition-all duration-200 overflow-visible interactive-card ${selectionMode?.isSelected ? 'ring-2 ring-accent border-accent' : ''} ${selectionMode?.enabled ? 'pl-8' : ''}`}>
                        <CardContent className="p-6 overflow-visible">
                            <div className="space-y-4">
                                {/* Header with title, tags, and metadata */}
                                <div className="space-y-3">
                                    <div className="relative">
                                        <CardTitle
                                            className="font-serif text-lg font-medium leading-tight text-content-primary group-hover:text-content-primary transition-colors line-clamp-2 cursor-pointer"
                                            onMouseEnter={() => setIsTitleHovered(true)}
                                            onMouseLeave={() => setIsTitleHovered(false)}
                                        >
                                            {displayTitle}
                                        </CardTitle>

                                        {/* Custom tooltip for full title */}
                                        {isTitleHovered && entry.title.length > 50 && (
                                            <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-surface-raised border border-border rounded-lg shadow-lg z-[70] max-w-sm">
                                                <div className="text-sm font-medium text-content-primary leading-relaxed font-serif">
                                                    {entry.title}
                                                </div>
                                                <div className="absolute bottom-0 left-4 transform translate-y-full">
                                                    <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-surface-raised"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {entry.source && entry.source === 'SMART_ALERT' && (
                                            <Badge variant="success" className="text-[10px] py-0 px-2 h-6 whitespace-nowrap">
                                                <Brain className="h-2.5 w-2.5 mr-1" />
                                                Smart Alert
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-content-secondary h-5">
                                        {entry.authors && entry.authors.length > 0 && (
                                            <span className="truncate">
                                                {entry.authors.slice(0, 3).join(', ')}
                                                {entry.authors.length > 3 && ` +${entry.authors.length - 3}`}
                                            </span>
                                        )}
                                        {entry.authors && entry.authors.length > 0 && entry.year && (
                                            <span className="text-border/50">•</span>
                                        )}
                                        {entry.year && (
                                            <span>{entry.year}</span>
                                        )}
                                        {entry.saveCount && entry.saveCount > 1 && (
                                            <>
                                                <span className="text-border/50">•</span>
                                                <span className="text-xs text-content-tertiary">
                                                    {entry.saveCount} users
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Tags section - properly aligned */}
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
                                    {/* Collection Dropdown */}
                                    <div className="relative min-w-0" ref={collectionDropdownRef}>
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
                                            <div className="absolute top-full left-0 mt-1 z-[60] bg-surface-raised border border-border rounded-lg shadow-xl min-w-[160px]">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleCollectionChange(null);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-warm-sand transition-colors rounded-lg ${currentCollectionId === null ? 'bg-warm-sand font-medium' : ''
                                                        }`}
                                                >
                                                    no collection
                                                </button>
                                                {collections.length === 0 ? (
                                                    <div className="w-full text-left px-3 py-2 text-sm text-content-tertiary">
                                                        No collections
                                                    </div>
                                                ) : (
                                                    collections.map((c) => (
                                                        <button
                                                            key={c.id}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleCollectionChange(c.id);
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-warm-sand transition-colors rounded-lg ${c.id === currentCollectionId ? 'bg-warm-sand font-medium' : ''
                                                                }`}
                                                        >
                                                            {c.name}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Reading Status Dropdown */}
                                    <div className="relative min-w-0" ref={statusDropdownRef}>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsOpen(!isOpen);
                                            }}
                                            className={`h-11 sm:h-6 w-full inline-flex items-center justify-between gap-2 text-[10px] tracking-wider rounded-lg font-medium px-4 sm:px-2 py-1 border transition-colors touch-manipulation ${statusVariant(currentStatus) === 'success'
                                                ? 'border-green-600 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-400 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900'
                                                : statusVariant(currentStatus) === 'default'
                                                    ? 'border-border bg-surface-raised text-content-primary hover:bg-warm-sand'
                                                    : 'border-border bg-secondary text-content-secondary hover:bg-secondary/80'
                                                }`}
                                            disabled={isUpdating}
                                        >
                                            <span className="truncate">{isUpdating ? '...' : readingStatuses.find(s => s.value === currentStatus)?.label?.toLowerCase()}</span>
                                            <ChevronDown className="w-4 h-4 sm:w-3 sm:h-3" />
                                        </button>

                                        {isOpen && (
                                            <div className="absolute top-full left-0 mt-1 z-[60] bg-surface-raised border border-border rounded-lg shadow-xl min-w-[120px]">
                                                {readingStatuses.map((status) => (
                                                    <button
                                                        key={status.value}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleStatusChange(status.value as FlatEntry['readingStatus']);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-warm-sand transition-colors rounded-lg ${status.value === currentStatus ? 'bg-warm-sand font-medium' : ''
                                                            }`}
                                                    >
                                                        {status.label}
                                                    </button>
                                                ))}
                                                <div className="border-t border-border-default">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDelete();
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 dark:text-destructive/80 transition-colors flex items-center gap-2 rounded-lg touch-manipulation"
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
                                <div className="pt-4 border-t border-border/50">
                                    <div className="flex flex-col gap-2">
                                        {/* Paper links section */}
                                        {(entry.url || entry.metadata?.openAccessUrl || entry.doi) && (
                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                {entry.metadata?.openAccessUrl && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-green-700 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-950 dark:text-green-400 touch-manipulation"
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
                                                        className="h-6 px-2 text-content-secondary hover:text-content-primary touch-manipulation"
                                                        onClick={handleOpenUrl}
                                                    >
                                                        View Source
                                                        <ExternalLink className="w-3 h-3 ml-1" />
                                                    </Button>
                                                )}
                                                {entry.doi && (
                                                    <div className="flex items-center gap-1 text-content-secondary">
                                                        <span className="text-xs">DOI: {entry.doi}</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-5 w-5 p-0 text-content-secondary hover:text-content-primary touch-manipulation"
                                                            onClick={handleCopyDoi}
                                                        >
                                                            {didCopyDoi ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Date and action buttons */}
                                        <div className="flex items-center justify-between text-[10px] text-content-tertiary">
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
                                                        className="h-10 w-10 sm:h-6 sm:w-auto px-2 text-content-tertiary hover:text-content-secondary touch-manipulation"
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
        </>
    );
}
