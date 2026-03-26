'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Trash2, UserPlus, X, ChevronDown, Globe, Eye, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import EntryCard from '@/components/EntryCard';
import { useApiKey } from '@/hooks/useApiKey';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface CollectionMember {
    id: string;
    userId: string;
    role: 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN';
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    invitedAt: string;
    acceptedAt: string | null;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
}

interface Collection {
    id: string;
    name: string;
    description: string | null;
    userId: string | null;
    createdAt: string;
    isPublic?: boolean;
    publicSlug?: string | null;
    publicDescription?: string | null;
    publicViewCount?: number;
    entries: Array<{
        id: string;
        addedAt: string;
        entry: {
            id: string;
            createdAt: string;
            title: string;
            authors: string[];
            year: number | null;
            contentType: string;
            readingStatus: 'UNREAD' | 'READING' | 'READ';
            autoKeywords: string[];
            topics: string[];
            collections?: Array<{
                id: string;
                collection: {
                    id: string;
                    name: string;
                };
            }>;
        };
    }>;
    members?: CollectionMember[];
    _count: {
        entries: number;
        members?: number;
    };
}

export default function CollectionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const apiKey = useApiKey();
    const { data: session } = useSession();
    const [collection, setCollection] = useState<Collection | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [removing, setRemoving] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'VIEWER' | 'CONTRIBUTOR' | 'ADMIN'>('VIEWER');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');
    const [updatingMember, setUpdatingMember] = useState<string | null>(null);
    const [contacts, setContacts] = useState<Array<{ id: string; name: string | null; email: string; username: string | null }>>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactsOpen, setContactsOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string | null; email: string; username: string | null }>>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Share settings state
    const [isPublic, setIsPublic] = useState(false);
    const [publicDescription, setPublicDescription] = useState('');
    const [updatingVisibility, setUpdatingVisibility] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState(false);
    const [deletingCollection, setDeletingCollection] = useState(false);

    // Use scroll position restoration for collection pages
    useScrollPosition(`collection-${params.id}`);

    useEffect(() => {
        if (params.id) {
            fetchCollection();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    useEffect(() => {
        if (collection) {
            setIsPublic(collection.isPublic || false);
            setPublicDescription(collection.publicDescription || '');
        }
    }, [collection]);

    useEffect(() => {
        if (showInviteModal && contacts.length === 0 && !contactsLoading) {
            (async () => {
                setContactsLoading(true);
                try {
                    const res = await fetch(`/api/collections/contacts`);
                    if (res.ok) {
                        const data = await res.json();
                        setContacts(Array.isArray(data) ? data : []);
                    }
                } catch (e) {
                    // noop
                } finally {
                    setContactsLoading(false);
                }
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showInviteModal]);

    const fetchCollection = async () => {
        try {
            const response = await fetch(`/api/collections/${params.id}`);
            if (response.ok) {
                const data = await response.json();
                setCollection(data);
            } else {
                console.error('Collection not found');
                router.push('/collections');
            }
        } catch (error) {
            console.error('Error fetching collection:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                // Transform the search results to match our contact structure
                const transformedResults = data.map((user: any) => ({
                    id: user.id,
                    name: user.name,
                    email: user.email || `${user.username}@example.com`, // Add placeholder email if missing
                    username: user.username
                }));
                setSearchResults(transformedResults);
            }
        } catch (e) {
            console.error('Error searching users:', e);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleRemoveEntry = async (entryId: string) => {
        if (!confirm('Remove this entry from the collection?')) return;

        setRemoving(entryId);
        try {
            const response = await fetch(`/api/collections/${params.id}/entries/${entryId}`, {
                method: 'DELETE',
                headers: {
                    'x-api-key': apiKey,
                },
            });

            if (response.ok) {
                // Update local state to maintain scroll position
                setCollection(prev => prev ? {
                    ...prev,
                    entries: prev.entries.filter(item => item.entry.id !== entryId),
                    _count: {
                        entries: prev._count.entries - 1
                    }
                } : null);
            } else {
                const error = await response.json();
                alert(`Failed to remove entry: ${error.error}`);
            }
        } catch (error) {
            console.error('Error removing entry:', error);
            alert('Failed to remove entry');
        } finally {
            setRemoving(null);
        }
    };

    const handleInviteMember = async () => {
        setInviteError('');
        setInviteSuccess('');
        setInviting(true);

        try {
            if (inviteEmail.trim().toLowerCase() === (session?.user?.email || '').toLowerCase()) {
                setInviteError('You cannot invite yourself to a collection');
                setInviting(false);
                return;
            }
            const response = await fetch(`/api/collections/${params.id}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });

            const data = await response.json();

            if (response.ok) {
                setInviteSuccess(`Invite sent to ${inviteEmail}`);
                setInviteEmail('');
                setInviteRole('VIEWER');
                fetchCollection();
                setTimeout(() => {
                    setShowInviteModal(false);
                    setInviteSuccess('');
                }, 2000);
            } else {
                setInviteError(data.error || 'Failed to send invite');
            }
        } catch (error) {
            setInviteError('Failed to send invite');
        } finally {
            setInviting(false);
        }
    };

    const handleUpdateMemberRole = async (memberId: string, newRole: 'VIEWER' | 'CONTRIBUTOR' | 'ADMIN') => {
        setUpdatingMember(memberId);
        try {
            const response = await fetch(`/api/collections/${params.id}/members/${memberId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (response.ok) {
                fetchCollection();
            } else {
                const error = await response.json();
                alert(`Failed to update role: ${error.error}`);
            }
        } catch (error) {
            alert('Failed to update role');
        } finally {
            setUpdatingMember(null);
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string | null) => {
        if (!confirm(`Remove ${memberName || 'this member'} from the collection?`)) return;

        try {
            const response = await fetch(`/api/collections/${params.id}/members/${memberId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchCollection();
            } else {
                const error = await response.json();
                alert(`Failed to remove member: ${error.error}`);
            }
        } catch (error) {
            alert('Failed to remove member');
        }
    };

    const handleLeaveCollection = async () => {
        if (!confirm('Are you sure you want to leave this collection?')) return;
        const userMembership = collection?.members?.find(m => m.user.id === session?.user?.id);
        if (!userMembership) return;

        try {
            const response = await fetch(`/api/collections/${params.id}/members/${userMembership.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                router.push('/collections');
            } else {
                const error = await response.json();
                alert(`Failed to leave collection: ${error.error}`);
            }
        } catch (error) {
            alert('Failed to leave collection');
        }
    };

    const handleDeleteCollection = async () => {
        if (!collection) return;

        if (!confirm(`Are you sure you want to delete "${collection.name}"? This action cannot be undone.`)) {
            return;
        }

        setDeletingCollection(true);
        try {
            const response = await fetch(`/api/collections/${params.id}`, {
                method: 'DELETE',
                headers: { 'x-api-key': apiKey },
            });

            if (response.ok) {
                router.push('/collections');
            } else {
                const data = await response.json();
                alert(data?.error || 'Failed to delete collection');
            }
        } catch (error) {
            console.error('Error deleting collection:', error);
            alert('Failed to delete collection');
        } finally {
            setDeletingCollection(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const isOwner = collection?.userId === session?.user?.id;
    const userMember = collection?.members?.find(m => m.user.id === session?.user?.id);
    const canManage = isOwner || userMember?.role === 'ADMIN';

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'OWNER': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-700';
            case 'ADMIN': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 border-red-200 dark:border-red-700';
            case 'CONTRIBUTOR': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-700';
            case 'VIEWER': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
        }
    };

    const filteredEntries = collection?.entries.filter(item =>
        item.entry.title.toLowerCase().includes(search.toLowerCase()) ||
        item.entry.authors.some(author => author.toLowerCase().includes(search.toLowerCase())) ||
        item.entry.topics.some(topic => topic.toLowerCase().includes(search.toLowerCase())) ||
        item.entry.autoKeywords.some(keyword => keyword.toLowerCase().includes(search.toLowerCase()))
    ) || [];

    const handleUpdateVisibility = async () => {
        setUpdatingVisibility(true);
        try {
            const response = await fetch(`/api/collections/${params.id}/visibility`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isPublic,
                    publicDescription: isPublic ? publicDescription : null
                }),
            });

            if (response.ok) {
                const updatedCollection = await response.json();
                setCollection(prev => prev ? { ...prev, ...updatedCollection } : null);
                toast.success(isPublic ? 'Collection is now public' : 'Collection is now private');
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to update visibility');
            }
        } catch (error) {
            toast.error('Failed to update visibility');
        } finally {
            setUpdatingVisibility(false);
        }
    };

    const handleCopyPublicUrl = async () => {
        if (!collection?.publicSlug) return;
        const url = `${window.location.origin}/c/${collection.publicSlug}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedSlug(true);
            setTimeout(() => setCopiedSlug(false), 2000);
            toast.success('Public URL copied to clipboard');
        } catch (error) {
            toast.error('Failed to copy URL');
        }
    };

    if (loading) {
        return <div className="text-center py-12">Loading collection...</div>;
    }

    if (!collection) {
        return <div className="text-center py-12">Collection not found.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <Link href="/collections">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Collections
                    </Button>
                </Link>
            </div>

            <div>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-medium tracking-tight">{collection.name}</h2>
                        {collection.description && (
                            <p className="text-sm text-muted-foreground mt-1">{collection.description}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                            {collection._count.entries} {collection._count.entries === 1 ? 'entry' : 'entries'}
                            {collection.isPublic && (
                                <span className="ml-2 inline-flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {collection.publicViewCount || 0} views
                                </span>
                            )}
                        </p>
                    </div>
                    {isOwner && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDeleteCollection}
                            disabled={deletingCollection}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            {deletingCollection ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Share Settings Section - Only visible to owner */}
            {isOwner && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Share Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium">Make this collection public</label>
                                <p className="text-xs text-muted-foreground">
                                    Anyone with the link can view this collection
                                </p>
                            </div>
                            <button
                                onClick={() => setIsPublic(!isPublic)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-primary' : 'bg-muted'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {isPublic && (
                            <>
                                {collection.publicSlug && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Public URL</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={`${window.location.origin}/c/${collection.publicSlug}`}
                                                className="flex-1 px-3 py-2 text-sm bg-muted border rounded-md"
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleCopyPublicUrl}
                                            >
                                                {copiedSlug ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(`/c/${collection.publicSlug}`, '_blank', 'noopener,noreferrer')}
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Public description</label>
                                    <Textarea
                                        placeholder="Describe this collection for visitors..."
                                        value={publicDescription}
                                        onChange={(e) => setPublicDescription(e.target.value)}
                                        maxLength={280}
                                        rows={3}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {publicDescription.length}/280 characters
                                    </p>
                                </div>

                                <Button
                                    onClick={handleUpdateVisibility}
                                    disabled={updatingVisibility}
                                    size="sm"
                                >
                                    {updatingVisibility ? 'Updating...' : 'Save Changes'}
                                </Button>
                            </>
                        )}

                        {!isPublic && collection.isPublic !== isPublic && (
                            <Button
                                onClick={handleUpdateVisibility}
                                disabled={updatingVisibility}
                                size="sm"
                            >
                                {updatingVisibility ? 'Updating...' : 'Make Private'}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Members Section */}
            {(isOwner || (collection.members && collection.members.length > 0)) && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Members</CardTitle>
                            {canManage && (
                                <Button size="sm" onClick={() => setShowInviteModal(true)} data-onboarding="share-collection">
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Invite Member
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {/* Owner */}
                            {collection.userId && (
                                <div className="flex items-center justify-between py-2 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                            {session?.user?.name?.[0] || session?.user?.email?.[0] || 'O'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{session?.user?.name || 'You'}</p>
                                            <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                                        </div>
                                    </div>
                                    <Badge className={getRoleBadgeColor('OWNER')}>Owner</Badge>
                                </div>
                            )}

                            {/* Members */}
                            {collection.members?.filter(m => m.status === 'ACCEPTED').map((member) => (
                                <div key={member.id} className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                                            {member.user.name?.[0] || member.user.email[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{member.user.name || 'User'}</p>
                                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canManage ? (
                                            <Select
                                                value={member.role}
                                                onValueChange={(value) => handleUpdateMemberRole(member.id, value as any)}
                                                disabled={updatingMember === member.id}
                                            >
                                                <SelectTrigger className="w-24 h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="VIEWER">Viewer</SelectItem>
                                                    <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge className={getRoleBadgeColor(member.role)}>
                                                {member.role.toLowerCase()}
                                            </Badge>
                                        )}
                                        {canManage && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveMember(member.id, member.user.name)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Pending Invites */}
                            {collection.members && collection.members.filter(m => m.status === 'PENDING').length > 0 && (
                                <div className="pt-3 border-t border-border">
                                    <p className="text-xs text-muted-foreground mb-2">Pending Invites</p>
                                    {collection.members.filter(m => m.status === 'PENDING').map((member) => (
                                        <div key={member.id} className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-sm font-medium opacity-50">
                                                    {member.user.name?.[0] || member.user.email[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium opacity-50">{member.user.name || 'User'}</p>
                                                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">Pending</Badge>
                                                {canManage && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveMember(member.id, member.user.name)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isOwner && (
                                <div className="pt-3 border-t border-border">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleLeaveCollection}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        Leave Collection
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="bg-white border rounded-lg shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Invite Member</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Email or Username</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={inviteEmail}
                                        onChange={(e) => {
                                            setInviteEmail(e.target.value);
                                            setContactsOpen(true);
                                            searchUsers(e.target.value);
                                        }}
                                        onFocus={() => setContactsOpen(true)}
                                        onBlur={() => setTimeout(() => setContactsOpen(false), 150)}
                                        placeholder="user@example.com or @username"
                                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                                        autoComplete="off"
                                    />
                                    {contactsOpen && (
                                        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                            {/* Show loading indicator */}
                                            {searchLoading && (
                                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                                    Searching...
                                                </div>
                                            )}

                                            {/* Show search results if query is typed */}
                                            {inviteEmail.length >= 1 && !searchLoading && (
                                                <>
                                                    {searchResults
                                                        .filter(c =>
                                                            // Exclude current user
                                                            c.email.toLowerCase() !== (session?.user?.email || '').toLowerCase() &&
                                                            c.id !== session?.user?.id
                                                        )
                                                        .slice(0, 5)
                                                        .map(c => (
                                                            <button
                                                                type="button"
                                                                key={`search-${c.id}`}
                                                                className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors"
                                                                onMouseDown={(e) => { e.preventDefault(); setInviteEmail(c.email); setContactsOpen(false); }}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{c.name || c.email}</span>
                                                                    <div className="text-muted-foreground text-xs">
                                                                        {c.username && <span>@{c.username}</span>}
                                                                        {c.username && c.email && <span className="mx-1">•</span>}
                                                                        {c.email && <span>{c.email}</span>}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                </>
                                            )}

                                            {/* Show existing contacts if no query or as fallback */}
                                            {inviteEmail.length === 0 && contacts.length > 0 && (
                                                <>
                                                    <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                                                        Recent Contacts
                                                    </div>
                                                    {contacts
                                                        .slice(0, 5)
                                                        .map(c => (
                                                            <button
                                                                type="button"
                                                                key={`contact-${c.id}`}
                                                                className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors"
                                                                onMouseDown={(e) => { e.preventDefault(); setInviteEmail(c.email); setContactsOpen(false); }}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{c.name || c.email}</span>
                                                                    <div className="text-muted-foreground text-xs">
                                                                        {c.username && <span>@{c.username}</span>}
                                                                        {c.username && c.email && <span className="mx-1">•</span>}
                                                                        {c.email && <span>{c.email}</span>}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Role</label>
                                <Select
                                    value={inviteRole}
                                    onValueChange={(value) => setInviteRole(value as any)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VIEWER">Viewer</SelectItem>
                                        <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                {inviteRole === 'ADMIN' && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        Admin role requires both users to have Pro accounts
                                    </p>
                                )}
                            </div>

                            {inviteError && (
                                <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                            )}

                            {inviteSuccess && (
                                <p className="text-sm text-green-600 dark:text-green-400">{inviteSuccess}</p>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleInviteMember}
                                    disabled={inviting || !inviteEmail}
                                    className="flex-1"
                                >
                                    {inviting ? 'Sending...' : 'Send Invite'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowInviteModal(false)}
                                    disabled={inviting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2 border-b border-border pb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search entries..."
                        className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-sm"
                    />
                </div>
            </div>

            {filteredEntries.length === 0 ? (
                <div className="text-center py-24 rounded-lg bg-[var(--background)]">
                    <p className="text-[var(--muted-foreground)]">
                        {search ? 'No entries found matching your search.' : 'No entries in this collection yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredEntries.map(item => (
                        <div key={item.id} className="relative group">
                            <EntryCard entry={item.entry} scrollPositionKey={`collection-${params.id}`} />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveEntry(item.entry.id)}
                                    disabled={removing === item.entry.id}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
