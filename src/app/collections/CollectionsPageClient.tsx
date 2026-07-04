'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, X } from 'lucide-react';
import UpgradeBanner from '@/components/UpgradeBanner';
import { useSession } from 'next-auth/react';
import { hasPaidFeature } from '@/lib/plans';
import { useLibrary } from '@/hooks/useLibrary';
import EntryCard from '@/components/EntryCard';

interface CollectionInvite {
    id: string;
    role: 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN';
    invitedAt: string;
    collection: {
        id: string;
        name: string;
        description: string | null;
    };
    inviter: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface Collection {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    entryCount?: number;
    memberCount?: number;
    isOwner?: boolean;
    userRole?: 'OWNER' | 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN';
    members?: any[];
    isPublic?: boolean;
    publicViewCount?: number;
    publicDescription?: string | null;
    user?: {
        name?: string | null;
        username?: string | null;
    } | null;
    isDiscovery?: boolean;
    metadata?: any;
    entries?: Array<{
        entry: {
            id: string;
            title: string;
        };
    }>;
    _count: {
        entries: number;
        members?: number;
    };
}

const STATUS_TABS = [
    { label: 'All', value: '' },
    { label: 'Unread', value: 'UNREAD' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
];

function CollectionRightPanel({ collectionId, collectionName }: { collectionId: string | null; collectionName: string }) {
    const [statusFilter, setStatusFilter] = useState('');
    const { entries, total, loading, hasMore, loadMore } = useLibrary({
        collectionId: collectionId ?? undefined,
        readingStatus: statusFilter || undefined,
    });

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f0ede4' }}>
            {/* Filter bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '44px', borderBottom: '1px solid #e8e4d8', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            style={{
                                padding: '4px 10px',
                                fontSize: '13px',
                                color: statusFilter === tab.value ? '#c96442' : '#4a5e56',
                                cursor: 'pointer',
                                borderBottom: statusFilter === tab.value ? '2px solid #c96442' : '2px solid transparent',
                                borderTop: 'none',
                                borderLeft: 'none',
                                borderRight: 'none',
                                background: 'none',
                                fontFamily: 'system-ui, sans-serif',
                                transition: 'color 100ms, border-color 100ms',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Count */}
            <div style={{ padding: '6px 16px', fontSize: '12px', color: '#7a8e86', borderBottom: '1px solid #e8e4d8', flexShrink: 0 }}>
                {loading ? 'loading…' : `${total} ${total === 1 ? 'entry' : 'entries'}`}
            </div>

            {/* Entries */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {!loading && entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 16px', color: '#7a8e86', fontSize: '13px' }}>
                        {collectionId ? 'No entries in this collection yet.' : 'Select a collection to view entries.'}
                    </div>
                ) : (
                    <>
                        {entries.map((entry) => (
                            <EntryCard
                                key={entry.id}
                                entry={entry}
                                scrollPositionKey={`collection-${collectionId}`}
                                fromPath="/collections"
                                hideCollectionPill
                            />
                        ))}
                        {hasMore && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    style={{
                                        padding: '4px 16px',
                                        border: '1px solid #e8e4d8',
                                        borderRadius: '6px',
                                        background: '#f7f4ee',
                                        fontSize: '12px',
                                        color: '#4a5e56',
                                        cursor: 'pointer',
                                        fontFamily: 'system-ui, sans-serif',
                                    }}
                                >
                                    Load more
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function CollectionsPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [invites, setInvites] = useState<CollectionInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newCollection, setNewCollection] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [respondingToInvite, setRespondingToInvite] = useState<string | null>(null);
    const [deletingCollection, setDeletingCollection] = useState<string | null>(null);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDropdown, setShowDropdown] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingDescription, setEditingDescription] = useState('');
    const [updating, setUpdating] = useState(false);
    const [editFormError, setEditFormError] = useState<string | null>(null);
    const [editTouched, setEditTouched] = useState<{ name: boolean; description: boolean }>({ name: false, description: false });
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
    const { data: session } = useSession();
    const router = useRouter();

    const NAME_MAX = 80;
    const NAME_MIN = 3;
    const DESC_MAX = 280;
    const [formError, setFormError] = useState<string | null>(null);
    const [touched, setTouched] = useState<{ name: boolean; description: boolean }>({ name: false, description: false });
    const nameTooShort = newCollection.name.trim().length > 0 && newCollection.name.trim().length < NAME_MIN;
    const nameTooLong = newCollection.name.trim().length > NAME_MAX;
    const descTooLong = newCollection.description.trim().length > DESC_MAX;
    const isValid = newCollection.name.trim().length >= NAME_MIN && !nameTooLong && !descTooLong;
    const editNameTooShort = editingName.trim().length > 0 && editingName.trim().length < NAME_MIN;
    const editNameTooLong = editingName.trim().length > NAME_MAX;
    const editDescTooLong = editingDescription.trim().length > DESC_MAX;
    const isEditValid = editingName.trim().length >= NAME_MIN && !editNameTooLong && !editDescTooLong;

    const fetchInvites = useCallback(async (isCancelled?: () => boolean) => {
        try {
            const response = await fetch('/api/collections/invites');
            if (response.ok) {
                const data = await response.json();
                if (isCancelled?.()) return;
                setInvites(data);
            }
        } catch (error) {
            if (isCancelled?.()) return;
            console.error('Failed to fetch invites:', error);
        }
    }, []);

    const fetchCollections = useCallback(async (isCancelled?: () => boolean) => {
        try {
            const response = await fetch('/api/collections');
            if (response.ok) {
                const data = await response.json();
                const transformCollection = (c: any) => ({
                    ...c,
                    entries: c.userEntryCollections?.map((uec: any) => ({
                        entry: {
                            id: uec.userEntry.globalEntry.id,
                            title: uec.userEntry.globalEntry.title
                        }
                    })) || [],
                    entryCount: c.entryCount ?? c._count?.userEntryCollections ?? c._count?.entries ?? 0,
                    memberCount: c.memberCount ?? c.members?.length ?? c._count?.members ?? 0,
                });
                const collectionsWithOwnership = [
                    ...data.owned.map((c: any) => ({ ...transformCollection(c), isOwner: true, userRole: 'OWNER' as const })),
                    ...data.member.map((c: any) => ({ ...transformCollection(c), isOwner: false, userRole: c.userRole || 'VIEWER' as const }))
                ];
                if (isCancelled?.()) return;
                setCollections(collectionsWithOwnership);
                // Auto-select first collection
                if (collectionsWithOwnership.length > 0 && !activeCollectionId) {
                    const firstMine = collectionsWithOwnership.filter((c: any) => !c.isDiscovery)[0];
                    if (firstMine) setActiveCollectionId(firstMine.id);
                }
            }
        } catch (error) {
            if (isCancelled?.()) return;
            console.error('Failed to fetch collections:', error);
        } finally {
            if (isCancelled?.()) return;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            fetchCollections(() => cancelled),
            fetchInvites(() => cancelled)
        ]);

        return () => {
            cancelled = true;
        };
    }, [fetchCollections, fetchInvites]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-collection-menu="true"]')) {
                return;
            }

            if (showDropdown) {
                setShowDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    const handleCreateCollection = async () => {
        setFormError(null);
        setTouched({ name: true, description: true });

        if (!isValid) {
            return;
        }

        setCreating(true);
        try {
            const response = await fetch('/api/collections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newCollection.name.trim().slice(0, NAME_MAX),
                    description: newCollection.description.trim().slice(0, DESC_MAX),
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok && data?.id) {
                setNewCollection({ name: '', description: '' });
                setShowCreateModal(false);
                fetchCollections();
                router.push(`/collections/${data.id}`);
            } else {
                const message = data?.error || 'Failed to create collection';
                setFormError(message);
            }
        } catch (error: any) {
            const message = error?.message || 'Failed to create collection';
            setFormError(message);
        } finally {
            setCreating(false);
        }
    };

    const handleRespondToInvite = async (inviteId: string, action: 'accept' | 'decline') => {
        setRespondingToInvite(inviteId);
        try {
            const response = await fetch(`/api/collections/invites/${inviteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });

            if (response.ok) {
                await Promise.all([fetchCollections(), fetchInvites()]);
            } else {
                const data = await response.json();
                alert(data?.error || `Failed to ${action} invite`);
            }
        } catch (error) {
            console.error(`Failed to ${action} invite:`, error);
            alert(`Failed to ${action} invite`);
        } finally {
            setRespondingToInvite(null);
        }
    };

    const handleDeleteCollection = async (collectionId: string, collectionName: string) => {
        if (!confirm(`Are you sure you want to delete "${collectionName}"? This action cannot be undone.`)) {
            return;
        }

        setDeletingCollection(collectionId);
        try {
            const response = await fetch(`/api/collections/${collectionId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setCollections(prev => prev.filter(c => c.id !== collectionId));
                if (activeCollectionId === collectionId) setActiveCollectionId(null);
            } else {
                const data = await response.json();
                alert(data?.error || 'Failed to delete collection');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            alert('Failed to delete collection');
        } finally {
            setDeletingCollection(null);
        }
    };

    const handleUpdateCollection = async () => {
        setEditFormError(null);
        setEditTouched({ name: true, description: true });

        if (!isEditValid) {
            return;
        }

        setUpdating(true);
        try {
            const response = await fetch(`/api/collections/${editingCollection?.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: editingName.trim().slice(0, NAME_MAX),
                    description: editingDescription.trim().slice(0, DESC_MAX),
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok && data?.id) {
                setEditingName('');
                setEditingDescription('');
                setShowEditModal(false);
                setEditingCollection(null);
                fetchCollections();
            } else {
                const message = data?.error || 'Failed to update collection';
                setEditFormError(message);
            }
        } catch (error: any) {
            const message = error?.message || 'Failed to update collection';
            setEditFormError(message);
        } finally {
            setUpdating(false);
        }
    };

    const openEditModal = (collection: Collection) => {
        setEditingCollection(collection);
        setEditingName(collection.name);
        setEditingDescription(collection.description || '');
        setEditFormError(null);
        setEditTouched({ name: false, description: false });
        setShowEditModal(true);
        setShowDropdown(null);
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '48px', color: '#7a8e86', fontSize: '14px' }}>Loading collections…</div>;
    }

    const myCollections = collections.filter(c => !c.isDiscovery);
    const activeCollection = myCollections.find(c => c.id === activeCollectionId) ?? null;

    return (
        <div style={{ background: '#f0ede4', minHeight: '100%' }}>
            {session?.user && !hasPaidFeature(session.user.plan || 'FREE', 'collections') && (
                <UpgradeBanner
                    message="Create and share collections of entries with other users. Upgrade to Pro to unlock collections."
                    ctaText="Upgrade to Pro for Collections"
                />
            )}

            {/* Pending invites (compact, above layout) */}
            {invites.length > 0 && (
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #e8e4d8', background: '#f7f4ee' }}>
                    <div style={{ fontSize: '11px', color: '#7a8e86', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                        Pending Invites
                    </div>
                    {invites.map((invite) => (
                        <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e8e4d8' }}>
                            <div>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e2d27' }}>{invite.collection.name}</span>
                                <span style={{ fontSize: '12px', color: '#7a8e86', marginLeft: '8px' }}>from {invite.inviter.name || invite.inviter.email}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={() => handleRespondToInvite(invite.id, 'accept')}
                                    disabled={respondingToInvite === invite.id}
                                    style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', border: '1px solid #c96442', background: '#c96442', color: '#fff', cursor: 'pointer' }}
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => handleRespondToInvite(invite.id, 'decline')}
                                    disabled={respondingToInvite === invite.id}
                                    style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '4px', border: '1px solid #e8e4d8', background: '#f7f4ee', color: '#4a5e56', cursor: 'pointer' }}
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Mobile: horizontal pill row (below md) */}
            <div className="flex md:hidden" style={{ gap: '6px', padding: '8px 16px', overflowX: 'auto', borderBottom: '1px solid #e8e4d8', background: '#f0ede4', scrollbarWidth: 'none' }}>
                {myCollections.map((c) => (
                    <button
                        key={c.id}
                        onClick={() => setActiveCollectionId(c.id)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            border: activeCollectionId === c.id ? '1px solid #c96442' : '1px solid #e8e4d8',
                            background: activeCollectionId === c.id ? '#c96442' : '#f7f4ee',
                            color: activeCollectionId === c.id ? '#fff' : '#4a5e56',
                            transition: 'all 100ms',
                            flexShrink: 0,
                        }}
                    >
                        {c.name} <span style={{ opacity: 0.7, fontSize: '11px' }}>{c.entryCount ?? c._count.entries}</span>
                    </button>
                ))}
                <button
                    onClick={() => setShowCreateModal(true)}
                    disabled={!session?.user || !hasPaidFeature(session.user.plan || 'FREE', 'collections')}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        border: '1px dashed #d0cec6',
                        background: 'none',
                        color: '#7a8e86',
                        flexShrink: 0,
                    }}
                >
                    + New
                </button>
            </div>

            {/* Desktop: two-panel layout */}
            <div className="hidden md:flex" style={{ height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
                {/* Left sidebar */}
                <div className="hidden md:flex flex-col" style={{ width: '260px', flexShrink: 0, borderRight: '1px solid #e8e4d8', overflowY: 'auto', background: '#f0ede4', paddingTop: '12px' }}>
                    <div style={{ padding: '0 16px 8px', fontSize: '11px', color: '#7a8e86', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Collections
                    </div>

                    {myCollections.map((collection) => (
                        <div
                            key={collection.id}
                            onClick={() => setActiveCollectionId(collection.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'background 100ms',
                                fontSize: '14px',
                                color: activeCollectionId === collection.id ? '#1e2d27' : '#4a5e56',
                                gap: '8px',
                                background: activeCollectionId === collection.id ? '#f7f4ee' : 'transparent',
                            }}
                        >
                            {/* Active accent bar */}
                            {activeCollectionId === collection.id && (
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: '#c96442' }} />
                            )}
                            <span style={{ fontFamily: 'system-ui, sans-serif', fontWeight: activeCollectionId === collection.id ? 500 : 400 }}>
                                {collection.name}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                <span style={{ fontSize: '11px', color: '#7a8e86', background: '#e8e4d8', padding: '2px 7px', borderRadius: '10px' }}>
                                    {collection.entryCount ?? collection._count.entries}
                                </span>
                                {collection.isOwner && (
                                    <div data-collection-menu="true" style={{ position: 'relative' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDropdown(showDropdown === collection.id ? null : collection.id);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a8e86', padding: '2px 4px', fontSize: '14px', lineHeight: 1 }}
                                        >
                                            ···
                                        </button>
                                        {showDropdown === collection.id && (
                                            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: '#f7f4ee', border: '1px solid #e8e4d8', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', minWidth: '140px' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowDropdown(null); openEditModal(collection); }}
                                                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', color: '#1e2d27', background: 'none', border: 'none', cursor: 'pointer', display: 'block' }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#e8e4d8')}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowDropdown(null); handleDeleteCollection(collection.id, collection.name); }}
                                                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', color: '#c96442', background: 'none', border: 'none', cursor: 'pointer', display: 'block' }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fdf0eb')}
                                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {myCollections.length === 0 && (
                        <div style={{ padding: '16px', fontSize: '13px', color: '#7a8e86' }}>
                            No collections yet.
                        </div>
                    )}

                    <div style={{ marginTop: 'auto', padding: '12px 16px 0' }}>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            disabled={!session?.user || !hasPaidFeature(session.user.plan || 'FREE', 'collections')}
                            className="w-full flex items-center justify-center text-sm text-[#4a5e56] border border-[#e8e4d8] rounded-lg bg-transparent hover:bg-[#f7f4ee] transition-colors duration-100 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-3 h-3 mr-2" />
                            + New Collection
                        </button>
                    </div>
                </div>

                {/* Right panel */}
                <CollectionRightPanel
                    collectionId={activeCollectionId}
                    collectionName={activeCollection?.name ?? ''}
                />
            </div>

            {/* Mobile: entry list below pills */}
            <div className="md:hidden">
                <CollectionRightPanel
                    collectionId={activeCollectionId}
                    collectionName={activeCollection?.name ?? ''}
                />
            </div>

            {/* FAB */}
            <Link
                href="/add"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#c96442',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(201,100,66,0.35)',
                    zIndex: 50,
                    textDecoration: 'none',
                }}
                title="Add entry"
            >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <line x1="10" y1="4" x2="10" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <line x1="4" y1="10" x2="16" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </Link>

            {/* Create Collection Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl p-6 max-w-[480px] w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Create New Collection</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 uppercase tracking-tight text-[var(--muted-foreground)]">Name *</label>
                                <input
                                    type="text"
                                    value={newCollection.name}
                                    onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                                    onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                                    className={`w-full px-3 py-3 sm:py-2 border rounded-md bg-[var(--background)] touch-manipulation ${(touched.name && (nameTooShort || nameTooLong)) ? 'border-destructive' : 'border-[var(--border)]'}`}
                                    placeholder="Enter collection name"
                                    aria-invalid={touched.name && (nameTooShort || nameTooLong)}
                                />
                                {touched.name && nameTooShort && (
                                    <p className="mt-1 text-xs text-red-600">Name must be at least {NAME_MIN} characters</p>
                                )}
                                {touched.name && nameTooLong && (
                                    <p className="mt-1 text-xs text-red-600">Name must be {NAME_MAX} characters or less</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={newCollection.description}
                                    onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                                    onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
                                    className={`w-full px-3 py-2 border rounded-md bg-background resize-none ${(touched.description && descTooLong) ? 'border-destructive' : ''}`}
                                    rows={3}
                                    placeholder="Enter collection description"
                                    aria-invalid={touched.description && descTooLong}
                                    aria-describedby="desc-help"
                                />
                                <div id="desc-help" className="mt-1 flex items-center justify-end text-xs">
                                    <span className={`${descTooLong ? 'text-red-600' : 'text-muted-foreground'}`}>
                                        {newCollection.description.trim().length}/{DESC_MAX}
                                    </span>
                                </div>
                            </div>

                            {formError && (
                                <p className="text-sm text-red-600">{formError}</p>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    onClick={handleCreateCollection}
                                    disabled={creating || !isValid}
                                    className="flex-1 h-11 sm:h-9 touch-manipulation"
                                >
                                    {creating ? (
                                        <span className="flex items-center">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Creating...
                                        </span>
                                    ) : 'Create'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={creating}
                                    className="flex-1 h-11 sm:h-9 touch-manipulation"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Collection Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl p-6 max-w-[480px] w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Edit Collection</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 uppercase tracking-tight text-[var(--muted-foreground)]">Name *</label>
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={() => setEditTouched(prev => ({ ...prev, name: true }))}
                                    className={`w-full px-3 py-3 sm:py-2 border rounded-md bg-[var(--background)] touch-manipulation ${(editTouched.name && (editNameTooShort || editNameTooLong)) ? 'border-destructive' : 'border-[var(--border)]'}`}
                                    placeholder="Enter collection name"
                                    aria-invalid={editTouched.name && (editNameTooShort || editNameTooLong)}
                                />
                                {editTouched.name && editNameTooShort && (
                                    <p className="mt-1 text-xs text-red-600">Name must be at least {NAME_MIN} characters</p>
                                )}
                                {editTouched.name && editNameTooLong && (
                                    <p className="mt-1 text-xs text-red-600">Name must be {NAME_MAX} characters or less</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={editingDescription}
                                    onChange={(e) => setEditingDescription(e.target.value)}
                                    onBlur={() => setEditTouched(prev => ({ ...prev, description: true }))}
                                    className={`w-full px-3 py-2 border rounded-md bg-background resize-none ${(editTouched.description && editDescTooLong) ? 'border-destructive' : ''}`}
                                    rows={3}
                                    placeholder="Enter collection description"
                                    aria-invalid={editTouched.description && editDescTooLong}
                                    aria-describedby="edit-desc-help"
                                />
                                <div id="edit-desc-help" className="mt-1 flex items-center justify-end text-xs">
                                    <span className={`${editDescTooLong ? 'text-red-600' : 'text-muted-foreground'}`}>
                                        {editingDescription.trim().length}/{DESC_MAX}
                                    </span>
                                </div>
                            </div>

                            {editFormError && (
                                <p className="text-sm text-red-600">{editFormError}</p>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    onClick={handleUpdateCollection}
                                    disabled={updating || !isEditValid}
                                    className="flex-1 h-11 sm:h-9 touch-manipulation"
                                >
                                    {updating ? (
                                        <span className="flex items-center">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Updating...
                                        </span>
                                    ) : 'Save Changes'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowEditModal(false)}
                                    disabled={updating}
                                    className="flex-1 h-11 sm:h-9 touch-manipulation"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
