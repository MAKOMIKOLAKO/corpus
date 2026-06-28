'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveScrollPositionForKey } from '@/hooks/useScrollPosition';
import { Check, Trash2 } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';
import { formatRelativeTime } from '@/lib/dateUtils';
import { useTimezone } from '@/hooks/useTimezone';
import { FlatEntry } from '@/types/entry';

const readingStatuses = [
    { value: 'UNREAD', label: 'Unread' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
];

const formatDate = (date: string | Date) => {
    const timezone = useTimezone();
    return formatRelativeTime(date, timezone);
};

function TypeIcon({ entry }: { entry: FlatEntry }) {
    if (entry.isbn) {
        return (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: '#87867f' }}>
                <rect x="1" y="2" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <path d="M9 3h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9" stroke="currentColor" strokeWidth="1.2" />
            </svg>
        );
    }
    if (entry.doi) {
        return (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: '#87867f' }}>
                <rect x="2" y="1" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.2" />
                <line x1="4" y1="4.5" x2="10" y2="4.5" stroke="currentColor" strokeWidth="1" />
                <line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1" />
                <line x1="4" y1="9.5" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1" />
            </svg>
        );
    }
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: '#87867f' }}>
            <path d="M2 2h10v9H2z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M2 2l2 2h8" stroke="currentColor" strokeWidth="1" />
        </svg>
    );
}

export default function EntryCard({
    entry,
    scrollPositionKey = 'library',
    fromPath,
    onDelete,
    selectionMode,
    hideCollectionPill,
}: {
    entry: FlatEntry;
    scrollPositionKey?: string;
    fromPath?: string;
    onDelete?: (userEntryId: string) => void;
    selectionMode?: {
        enabled: boolean;
        isSelected: boolean;
        onToggle: (id: string) => void;
    };
    hideCollectionPill?: boolean;
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

    const isCompleted = currentStatus === 'COMPLETED';
    const titleColor = isCompleted ? '#87867f' : '#141413';

    return (
        <>
            <div
                ref={cardRef}
                className={`relative group flex items-center gap-[10px] border-b border-[#f0eee6] cursor-pointer transition-[background,border-color] duration-[120ms] hover:bg-[#faf9f5] hover:border-b-transparent md:h-11 md:flex-nowrap min-h-[44px] flex-wrap py-2 md:py-0 px-4 ${selectionMode?.isSelected ? 'bg-[#faf9f5]' : ''}`}
            >
                {/* Accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c96442] opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms]" />

                {/* Selection checkbox */}
                {selectionMode?.enabled && (
                    <div
                        className="shrink-0 z-10"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            selectionMode.onToggle(entry.id);
                        }}
                    >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectionMode.isSelected ? 'bg-[#c96442] border-[#c96442]' : 'border-[#d0cec6]'}`}>
                            {selectionMode.isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                    </div>
                )}

                {/* Link: icon + title area */}
                <Link
                    href={selectionMode?.enabled ? '#' : `/entries/${entry.id}${fromPath ? `?from=${fromPath}` : ''}`}
                    scroll={false}
                    onClick={(e) => {
                        if (selectionMode?.enabled) {
                            e.preventDefault();
                            selectionMode.onToggle(entry.id);
                        } else {
                            saveScrollPositionForKey(scrollPositionKey);
                        }
                    }}
                    className="flex flex-1 min-w-0 items-center gap-[10px]"
                >
                    <TypeIcon entry={entry} />

                    {/* Desktop: baseline inline */}
                    <div className="hidden md:flex items-baseline flex-1 min-w-0">
                        <span
                            style={{
                                fontFamily: 'Georgia, serif',
                                fontSize: '15px',
                                fontWeight: 500,
                                color: titleColor,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '440px',
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                textDecorationColor: '#c0bfb9',
                            }}
                        >
                            {displayTitle}
                        </span>
                        {entry.authors && entry.authors.length > 0 && (
                            <span style={{ color: '#87867f', fontSize: '13px', whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}>
                                — {entry.authors.slice(0, 3).join(', ')}{entry.authors.length > 3 ? ` +${entry.authors.length - 3}` : ''}
                            </span>
                        )}
                        {entry.year && (
                            <span style={{ color: '#87867f', fontSize: '13px', whiteSpace: 'nowrap', marginLeft: '6px', flexShrink: 0 }}>
                                {entry.year}
                            </span>
                        )}
                    </div>

                    {/* Mobile: stacked */}
                    <div className="md:hidden flex-1 min-w-0">
                        <div
                            style={{
                                fontFamily: 'Georgia, serif',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: titleColor,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                textDecorationColor: '#c0bfb9',
                            }}
                        >
                            {displayTitle}
                        </div>
                        {(entry.authors?.length > 0 || entry.year) && (
                            <div style={{ fontSize: '12px', color: '#87867f', marginTop: '1px' }}>
                                {entry.authors?.length > 0
                                    ? `${entry.authors.slice(0, 2).join(', ')}${entry.authors.length > 2 ? ' et al.' : ''}`
                                    : ''}
                                {entry.authors?.length > 0 && entry.year ? ' · ' : ''}
                                {entry.year ?? ''}
                            </div>
                        )}
                    </div>
                </Link>

                {/* Pills area */}
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {/* Status pill + dropdown */}
                    <div className="relative" ref={statusDropdownRef}>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsOpen(!isOpen);
                            }}
                            className="focus:outline-none"
                            disabled={isUpdating}
                        >
                            {currentStatus === 'IN_PROGRESS' ? (
                                <span style={{ background: '#fdf0eb', color: '#c96442', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-block' }}>
                                    {isUpdating ? '…' : 'In Progress'}
                                </span>
                            ) : currentStatus === 'COMPLETED' ? (
                                <span style={{ border: '1px solid #e8e6de', color: '#87867f', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap', background: '#f0eee6', display: 'inline-block' }}>
                                    {isUpdating ? '…' : 'Completed'}
                                </span>
                            ) : (
                                <span style={{ color: '#87867f', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap', background: '#f0eee6', border: '1px solid #e8e6de', display: 'inline-block' }}>
                                    {isUpdating ? '…' : 'Unread'}
                                </span>
                            )}
                        </button>

                        {isOpen && (
                            <div className="absolute top-full right-0 mt-1 z-[60] border border-[#f0eee6] rounded-lg shadow-xl min-w-[120px]" style={{ background: '#faf9f5' }}>
                                {readingStatuses.map((status) => (
                                    <button
                                        key={status.value}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleStatusChange(status.value as FlatEntry['readingStatus']);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm transition-colors rounded-lg ${status.value === currentStatus ? 'font-medium' : ''}`}
                                        style={{ color: '#141413' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0eee6')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        {status.label}
                                    </button>
                                ))}
                                <div className="border-t border-[#f0eee6]">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDelete();
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded-lg touch-manipulation"
                                        style={{ color: '#c96442' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fdf0eb')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Collection pill + dropdown (hidden on mobile) */}
                    {!hideCollectionPill && (
                        <div className="relative hidden md:block" ref={collectionDropdownRef}>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsCollectionOpen(!isCollectionOpen);
                                }}
                                className="focus:outline-none"
                                disabled={isUpdatingCollection}
                            >
                                <span style={{ border: '1px solid #f0eee6', color: '#87867f', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap', background: '#faf9f5', display: 'inline-block' }}>
                                    {isUpdatingCollection ? '…' : currentCollectionName.toLowerCase()}
                                </span>
                            </button>

                            {isCollectionOpen && (
                                <div className="absolute top-full right-0 mt-1 z-[60] border border-[#f0eee6] rounded-lg shadow-xl min-w-[160px]" style={{ background: '#faf9f5' }}>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleCollectionChange(null);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg ${currentCollectionId === null ? 'font-medium' : ''}`}
                                        style={{ color: '#141413' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0eee6')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        no collection
                                    </button>
                                    {collections.length === 0 ? (
                                        <div className="w-full text-left px-3 py-2 text-sm" style={{ color: '#87867f' }}>
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
                                                className={`w-full text-left px-3 py-2 text-sm rounded-lg ${c.id === currentCollectionId ? 'font-medium' : ''}`}
                                                style={{ color: '#141413' }}
                                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0eee6')}
                                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                {c.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </>
    );
}
