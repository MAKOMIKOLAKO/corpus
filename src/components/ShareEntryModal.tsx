'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, SolidDialogContent, DialogHeader, DialogTitle } from '@/components/ui/solid-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Mail, Copy, Check, Share2, ExternalLink } from 'lucide-react';
import { useApiKey } from '@/hooks/useApiKey';

interface User {
    id: string;
    name?: string;
    username?: string;
    email?: string;
}

interface ShareEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: {
        id: string;
        title: string;
        authors: string[];
        url?: string | null;
    };
}

export default function ShareEntryModal({ isOpen, onClose, entry }: ShareEntryModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isSharing, setIsSharing] = useState(false);
    const [shareMessage, setShareMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const apiKey = useApiKey();
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const searchConnections = async () => {
            if (!searchQuery.trim() || !apiKey) {
                setUsers([]);
                return;
            }

            try {
                const response = await fetch(`/api/connections/search?q=${encodeURIComponent(searchQuery.trim())}`, {
                    headers: { 'x-api-key': apiKey },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUsers(Array.isArray(data) ? data : []);
                } else {
                    setUsers([]);
                }
            } catch (error) {
                console.error('Error searching connections:', error);
                setUsers([]);
            }
        };

        const timeoutId = setTimeout(searchConnections, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, apiKey]);

    const handleShareWithUsers = async () => {
        if (selectedUsers.length === 0) return;

        setIsSharing(true);
        setShareMessage(null);

        try {
            const response = await fetch('/api/entries/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                },
                body: JSON.stringify({
                    entryId: entry.id,
                    userIds: selectedUsers,
                }),
            });

            if (response.ok) {
                setShareMessage({ type: 'success', text: `Entry shared with ${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'}` });
                setSelectedUsers([]);
                setSearchQuery('');
                setTimeout(() => {
                    onClose();
                    setShareMessage(null);
                }, 2000);
            } else {
                const data = await response.json();
                setShareMessage({ type: 'error', text: data.error || 'Failed to share entry' });
            }
        } catch (error) {
            setShareMessage({ type: 'error', text: 'Failed to share entry' });
        } finally {
            setIsSharing(false);
        }
    };

    const handleCopyUrl = async () => {
        const url = entry.url || window.location.href;
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
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    const handleNativeShare = async () => {
        const shareData = {
            title: entry.title,
            text: `${entry.title}${entry.authors.length > 0 ? ` - ${entry.authors.slice(0, 3).join(', ')}` : ''}`,
            url: entry.url || window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await handleCopyUrl();
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const filteredUsers = users.filter(user => !selectedUsers.includes(user.id));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <SolidDialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        Share Entry
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Entry Info */}
                    <div className="p-3 bg-muted/50 rounded-lg">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1">{entry.title}</h4>
                        <p className="text-xs text-muted-foreground">
                            {entry.authors.slice(0, 2).join(', ')}
                            {entry.authors.length > 2 && ` +${entry.authors.length - 2}`}
                        </p>
                    </div>

                    {/* Share Actions */}
                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            onClick={handleNativeShare}
                            className="w-full justify-start"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share via system
                        </Button>

                        {entry.url && (
                            <Button
                                variant="outline"
                                onClick={handleCopyUrl}
                                className="w-full justify-start"
                            >
                                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                {copied ? 'URL copied!' : 'Copy URL'}
                            </Button>
                        )}

                        {entry.url && (
                            <Button
                                variant="outline"
                                onClick={() => window.open(entry.url!, '_blank', 'noopener,noreferrer')}
                                className="w-full justify-start"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open in browser
                            </Button>
                        )}
                    </div>

                    {/* Share with Users */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Share with connections</span>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Search connections by name or username..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        {/* Selected Users */}
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {users
                                    .filter(user => selectedUsers.includes(user.id))
                                    .map(user => (
                                        <Badge
                                            key={user.id}
                                            variant="secondary"
                                            className="cursor-pointer"
                                            onClick={() => toggleUserSelection(user.id)}
                                        >
                                            {user.name || user.username || user.email}
                                            <button className="ml-1 hover:text-destructive">
                                                ×
                                            </button>
                                        </Badge>
                                    ))}
                            </div>
                        )}

                        {/* Search Results */}
                        {searchQuery && filteredUsers.length > 0 && (
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {filteredUsers.map(user => (
                                    <div
                                        key={user.id}
                                        onClick={() => toggleUserSelection(user.id)}
                                        className="p-2 rounded-md hover:bg-muted cursor-pointer text-sm"
                                    >
                                        <div className="font-medium">
                                            {user.name || user.username || user.email}
                                        </div>
                                        {user.name && user.username && (
                                            <div className="text-xs text-muted-foreground">@{user.username}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Share Button */}
                        {selectedUsers.length > 0 && (
                            <Button
                                onClick={handleShareWithUsers}
                                disabled={isSharing}
                                className="w-full"
                            >
                                {isSharing ? (
                                    'Sharing...'
                                ) : (
                                    `Share with ${selectedUsers.length} user${selectedUsers.length === 1 ? '' : 's'}`
                                )}
                            </Button>
                        )}

                        {/* Share Message */}
                        {shareMessage && (
                            <div className={`p-3 rounded-lg text-sm ${shareMessage.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                                }`}>
                                {shareMessage.text}
                            </div>
                        )}
                    </div>
                </div>
            </SolidDialogContent>
        </Dialog>
    );
}
