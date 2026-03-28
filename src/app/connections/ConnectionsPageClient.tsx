'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, UserCheck, Clock, Search, X, Check, Trash2, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type User = { id: string; username: string | null; name: string | null; bio: string | null };
type Connection = { id: string; status: string; otherUser: User; requesterId?: string; receiverId?: string };
type SharedEntry = {
  id: string; status: string; message: string | null; sharedAt: string;
  entry: { id: string; title: string; contentType: string };
  sender?: User; receiver?: User;
};

const TABS = ['connections', 'requests', 'shared'] as const;
type Tab = typeof TABS[number];

export default function ConnectionsPageClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id ?? null;
  const [tab, setTab] = useState<Tab>('connections');

  // Connections state
  const [accepted, setAccepted] = useState<Connection[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Connection[]>([]);
  const [pendingSent, setPendingSent] = useState<Connection[]>([]);
  const [loadingConns, setLoadingConns] = useState(true);

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Shared entries state
  const [receivedEntries, setReceivedEntries] = useState<SharedEntry[]>([]);
  const [sentEntries, setSentEntries] = useState<SharedEntry[]>([]);
  const [loadingShared, setLoadingShared] = useState(true);

  const fetchConnections = useCallback(async () => {
    setLoadingConns(true);
    try {
      const res = await fetch('/api/connections');
      if (res.ok) {
        const data = await res.json();
        setAccepted(data.accepted || []);
        setPendingReceived(data.pending_received || []);
        setPendingSent(data.pending_sent || []);
      }
    } finally {
      setLoadingConns(false);
    }
  }, []);

  const fetchShared = useCallback(async () => {
    setLoadingShared(true);
    try {
      const res = await fetch('/api/entries/shared');
      if (res.ok) {
        const data = await res.json();
        setReceivedEntries(data.received || []);
        setSentEntries(data.sent || []);
      }
    } finally {
      setLoadingShared(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
    fetchShared();
  }, [fetchConnections, fetchShared]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setSearchResults(await res.json());
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const sendRequest = async (receiverId: string) => {
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId }),
    });
    if (res.ok) {
      setSearchResults(prev => prev.map(u => u.id === receiverId ? { ...u, connectionStatus: 'PENDING', isSentByMe: true } : u));
      fetchConnections();
    }
  };

  const respondToConnection = async (id: string, status: 'ACCEPTED' | 'DECLINED') => {
    const res = await fetch(`/api/connections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchConnections();
  };

  const removeConnection = async (id: string) => {
    if (!confirm('Remove this connection?')) return;
    const res = await fetch(`/api/connections/${id}`, { method: 'DELETE' });
    if (res.ok) fetchConnections();
  };

  const respondToSharedEntry = async (id: string, status: 'ACCEPTED' | 'DECLINED') => {
    const res = await fetch(`/api/entries/shared/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchShared();
      if (status === 'ACCEPTED') router.push('/library');
    }
  };

  const pendingCount = pendingReceived.length;
  const pendingShared = receivedEntries.filter(e => e.status === 'PENDING').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">connections</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Find people, manage requests, and shared entries.</p>
      </div>

      {/* Tabs */}
      <div className="flex w-full border-b border-[var(--border)]">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 sm:flex-none px-2 sm:px-6 py-4 sm:py-2 text-xs sm:text-sm font-medium capitalize transition-colors relative flex items-center justify-center gap-2 touch-manipulation ${tab === t
              ? 'text-[var(--foreground)] border-b-2 border-[var(--primary)] -mb-px'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
          >
            {t}
            {t === 'requests' && pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] sm:text-xs font-bold">
                {pendingCount}
              </span>
            )}
            {t === 'shared' && pendingShared > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] sm:text-xs font-bold">
                {pendingShared}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CONNECTIONS TAB */}
      {tab === 'connections' && (
        <div className="space-y-5">
          {/* Search */}
          <div className="glass-card rounded-xl border border-[var(--border)] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Find people</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by username or name…"
                className="w-full pl-9 pr-3 py-3 sm:py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] touch-manipulation"
              />
            </div>
            {searching && <p className="text-xs text-[var(--muted-foreground)]">Searching…</p>}
            {searchResults.length > 0 && (
              <ul className="space-y-2">
                {searchResults.map(u => (
                  <li key={u.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[var(--accent)]/20 transition-colors">
                    <Link href={`/profile/${u.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-sm font-medium shrink-0">
                        {(u.name || u.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:underline">{u.name || u.username}</p>
                        {u.username && <p className="text-xs text-[var(--muted-foreground)]">@{u.username}</p>}
                      </div>
                    </Link>
                    <ConnectionActionButton user={u} currentUserId={sessionUserId} onConnect={sendRequest} onRespond={respondToConnection} />
                  </li>
                ))}
              </ul>
            )}
            {query && !searching && searchResults.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">No users found.</p>
            )}
          </div>

          {/* Your connections */}
          <div className="glass-card rounded-xl border border-[var(--border)] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Your connections <span className="text-[var(--muted-foreground)] font-normal">({accepted.length})</span></h2>
            {loadingConns ? (
              <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
            ) : accepted.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No connections yet. Search for people above.</p>
            ) : (
              <ul className="space-y-2">
                {accepted.map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <Link href={`/profile/${c.otherUser.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-sm font-medium shrink-0">
                        {((c.otherUser.name || c.otherUser.username || '?')[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:underline">{c.otherUser.name || c.otherUser.username}</p>
                        {c.otherUser.username && <p className="text-xs text-[var(--muted-foreground)]">@{c.otherUser.username}</p>}
                      </div>
                    </Link>
                    <button
                      onClick={() => removeConnection(c.id)}
                      className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Remove connection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* REQUESTS TAB */}
      {tab === 'requests' && (
        <div className="space-y-5">
          <div className="glass-card rounded-xl border border-[var(--border)] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Incoming requests</h2>
            {pendingReceived.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No pending requests.</p>
            ) : (
              <ul className="space-y-3">
                {pendingReceived.map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <Link href={`/profile/${c.otherUser.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-sm font-medium shrink-0">
                        {((c.otherUser.name || c.otherUser.username || '?')[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:underline">{c.otherUser.name || c.otherUser.username}</p>
                        {c.otherUser.username && <p className="text-xs text-[var(--muted-foreground)]">@{c.otherUser.username}</p>}
                      </div>
                    </Link>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToConnection(c.id, 'ACCEPTED')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        <Check className="w-3 h-3" /> Accept
                      </button>
                      <button
                        onClick={() => respondToConnection(c.id, 'DECLINED')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--border)] text-xs font-medium hover:bg-[var(--accent)]/20 transition-colors"
                      >
                        <X className="w-3 h-3" /> Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card rounded-xl border border-[var(--border)] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Sent requests</h2>
            {pendingSent.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No sent requests pending.</p>
            ) : (
              <ul className="space-y-2">
                {pendingSent.map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <Link href={`/profile/${c.otherUser.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-sm font-medium shrink-0">
                        {((c.otherUser.name || c.otherUser.username || '?')[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:underline">{c.otherUser.name || c.otherUser.username}</p>
                        {c.otherUser.username && <p className="text-xs text-[var(--muted-foreground)]">@{c.otherUser.username}</p>}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                      <button
                        onClick={() => removeConnection(c.id)}
                        className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Cancel request"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* SHARED TAB */}
      {tab === 'shared' && (
        <div className="space-y-5">
          <div className="glass-card rounded-xl border border-[var(--border)] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Received entries</h2>
            {loadingShared ? (
              <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
            ) : receivedEntries.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No entries have been shared with you.</p>
            ) : (
              <ul className="space-y-3">
                {receivedEntries.map(s => (
                  <li key={s.id} className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-4 p-4 sm:p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <div className="min-w-0 flex-1 space-y-2 sm:space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-[var(--muted-foreground)] shrink-0" />
                        <p className="text-sm font-medium truncate">{s.entry.title}</p>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        From <span className="font-medium">@{s.sender?.username || s.sender?.name}</span>
                      </p>
                      {s.message && <p className="text-xs italic text-[var(--muted-foreground)] leading-relaxed">&quot;{s.message}&quot;</p>}
                      <StatusBadge status={s.status} />
                    </div>
                    {s.status === 'PENDING' && (
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <button
                          onClick={() => respondToSharedEntry(s.id, 'ACCEPTED')}
                          className="inline-flex items-center justify-center gap-1 px-4 py-3 sm:px-2.5 sm:py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium hover:opacity-90 transition-opacity touch-manipulation"
                        >
                          <Check className="w-3 h-3" /> Add to library
                        </button>
                        <button
                          onClick={() => respondToSharedEntry(s.id, 'DECLINED')}
                          className="inline-flex items-center justify-center gap-1 px-4 py-3 sm:px-2.5 sm:py-1.5 rounded-md border border-[var(--border)] text-xs font-medium hover:bg-[var(--accent)]/20 transition-colors touch-manipulation"
                        >
                          <X className="w-3 h-3" /> Decline
                        </button>
                      </div>
                    )}
                    {s.status === 'ACCEPTED' && (
                      <Link
                        href={`/library`}
                        className="shrink-0 inline-flex items-center justify-center gap-1 px-4 py-3 sm:px-2.5 sm:py-1.5 rounded-md border border-[var(--border)] text-xs hover:bg-[var(--accent)]/20 transition-colors touch-manipulation"
                      >
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-card rounded-xl border border-[var(--border)] p-4 space-y-3">
            <h2 className="text-sm font-semibold">Entries you&apos;ve shared</h2>
            {loadingShared ? (
              <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
            ) : sentEntries.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">You haven&apos;t shared any entries yet.</p>
            ) : (
              <ul className="space-y-3">
                {sentEntries.map(s => (
                  <li key={s.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-[var(--muted-foreground)] shrink-0" />
                        <p className="text-sm font-medium truncate">{s.entry.title}</p>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        To <span className="font-medium">@{s.receiver?.username || s.receiver?.name}</span>
                      </p>
                      {s.message && <p className="text-xs italic text-[var(--muted-foreground)]">&quot;{s.message}&quot;</p>}
                      <StatusBadge status={s.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    ACCEPTED: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    DECLINED: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] || ''}`}>
      {status.toLowerCase()}
    </span>
  );
}

function ConnectionActionButton({
  user,
  currentUserId,
  onConnect,
  onRespond,
}: {
  user: any;
  currentUserId: string | null;
  onConnect: (id: string) => void;
  onRespond: (id: string, status: 'ACCEPTED' | 'DECLINED') => void;
}) {
  if (currentUserId && user.id === currentUserId) return null;
  if (!user.connectionStatus) {
    return (
      <Button
        onClick={() => onConnect(user.id)}
        variant="default"
        size="sm"
        className="gap-1 h-7 text-xs font-medium"
      >
        <UserPlus className="w-3 h-3" /> Connect
      </Button>
    );
  }
  if (user.connectionStatus === 'PENDING' && user.isSentByMe) {
    return <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>;
  }
  if (user.connectionStatus === 'PENDING' && !user.isSentByMe) {
    return (
      <div className="flex gap-1">
        <button onClick={() => onRespond(user.connectionId, 'ACCEPTED')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] text-xs hover:opacity-90">
          <Check className="w-3 h-3" /> Accept
        </button>
        <button onClick={() => onRespond(user.connectionId, 'DECLINED')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--border)] text-xs hover:bg-[var(--accent)]/20">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }
  if (user.connectionStatus === 'ACCEPTED') {
    return <span className="text-xs text-green-600 flex items-center gap-1"><UserCheck className="w-3 h-3" />Connected</span>;
  }
  return null;
}
