'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Book,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  X,
  Share2,
  ExternalLink,
  ChevronDown,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ShareEntryModal from '@/components/ShareEntryModal';
import { useApiKey } from '@/hooks/useApiKey';

type Tab = 'PAPER' | 'BOOK' | 'URL';

interface QueueItem {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  inputType: 'URL' | 'PAPER' | 'BOOK';
  input: string;
  position: number;
  entryId: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface SearchResult {
  semanticScholarId?: string;
  openLibraryKey?: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract?: string | null;
  source?: string | null;
  doi?: string | null;
  isbn?: string | null;
  publisher?: string | null;
  pages?: number | null;
  coverUrl?: string | null;
  openAccessUrl?: string | null;
}

const TAB_ACTIVE = '#6366f1';

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />;
    case 'PROCESSING':
      return <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />;
    case 'COMPLETED':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

function inputTypeLabel(t: string) {
  if (t === 'PAPER') return 'Paper';
  if (t === 'BOOK') return 'Book';
  return 'URL';
}

function truncateInput(s: string, max = 60) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export default function AddEntryPage() {
  const router = useRouter();
  const apiKey = useApiKey();
  const [activeTab, setActiveTab] = useState<Tab>('PAPER');
  const [queue, setQueue] = useState<{
    items: QueueItem[];
    processingCount: number;
    pendingCount: number;
  }>({ items: [], processingCount: 0, pendingCount: 0 });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [urlStatus, setUrlStatus] = useState<{
    message: string;
    type: 'success' | 'error' | null;
  }>({ message: '', type: null });

  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [saveConfirmation, setSaveConfirmation] = useState<{
    id: string;
    title: string;
    authors: string[];
    url: string | null;
  } | null>(null);

  const [queueShowAll, setQueueShowAll] = useState(false);

  const refreshQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue');
      if (!res.ok) return;
      const data = await res.json();
      setQueue({
        items: data.items ?? [],
        processingCount: data.processingCount ?? 0,
        pendingCount: data.pendingCount ?? 0,
      });
    } catch (e) {
      console.error('Failed to fetch queue', e);
    }
  }, []);

  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    const active = queue.pendingCount + queue.processingCount > 0;
    if (!active) return;
    const id = setInterval(() => {
      refreshQueue();
    }, 3000);
    return () => clearInterval(id);
  }, [queue.pendingCount, queue.processingCount, refreshQueue]);

  const handleRemoveFromQueue = async (id: string) => {
    try {
      const res = await fetch(`/api/queue/${id}`, { method: 'DELETE' });
      if (res.ok) refreshQueue();
    } catch (e) {
      console.error('Failed to delete queue item', e);
    }
  };

  const handleRetryQueueItem = async (item: QueueItem) => {
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: 'URL',
          input: item.input,
          payload: null,
        }),
      });
      if (res.ok) refreshQueue();
    } catch (e) {
      console.error('Failed to retry queue item', e);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const minLen = activeTab === 'PAPER' ? 3 : 2;
    if (searchQuery.length < minLen) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setHasSearched(true);

    const endpoint = activeTab === 'PAPER' ? '/api/add/papers' : '/api/add/books';
    try {
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setSearchResults(data.results ?? []);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
      setUrlStatus({ message: 'Please enter a valid URL', type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputType: 'URL', input: urlInput, payload: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add to queue');
      }
      setUrlInput('');
      setUrlStatus({ message: 'Added to queue ✓', type: 'success' });
      setTimeout(() => setUrlStatus({ message: '', type: null }), 2000);
      refreshQueue();
    } catch (err: unknown) {
      setUrlStatus({
        message: err instanceof Error ? err.message : 'Failed to add to queue',
        type: 'error',
      });
    }
  };

  const resetToDefault = () => {
    setSaveConfirmation(null);
    setSelectedResult(null);
    setSearchResults([]);
    setSearchQuery('');
    setSearchError(null);
    setHasSearched(false);
    setActiveTab('PAPER');
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchResults([]);
    setSearchQuery('');
    setSearchError(null);
    setHasSearched(false);
    setSelectedResult(null);
  };

  const activeQueueCount = queue.processingCount + queue.pendingCount;
  const displayQueueItems = queueShowAll ? queue.items : queue.items.slice(0, 10);

  return (
    <div
      className="mx-auto min-h-screen max-w-[720px] bg-[var(--background)] p-6 text-[var(--foreground)] theme-transition"
      style={{ padding: 24 }}
    >
      <header className="mb-8">
        <h1 className="mb-6 font-serif text-3xl font-bold text-[var(--foreground)]">Add to Library</h1>

        {!selectedResult && !saveConfirmation && (
          <div className="flex gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 p-1">
            <TabButton
              active={activeTab === 'PAPER'}
              onClick={() => switchTab('PAPER')}
              label="Research Paper"
            />
            <TabButton active={activeTab === 'BOOK'} onClick={() => switchTab('BOOK')} label="Book" />
            <TabButton
              active={activeTab === 'URL'}
              onClick={() => switchTab('URL')}
              label="URL / Article"
            />
          </div>
        )}
      </header>

      <main className="mb-12">
        {saveConfirmation ? (
          <PostSavePanel
            confirmation={saveConfirmation}
            onAddAnother={resetToDefault}
            apiKey={apiKey}
            onViewEntry={() => router.push(`/entries/${saveConfirmation.id}`)}
          />
        ) : selectedResult ? (
          <PreviewForm
            item={selectedResult}
            type={activeTab}
            onBack={() => setSelectedResult(null)}
            onSave={(id, title, authors, url) =>
              setSaveConfirmation({ id, title, authors, url })
            }
          />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-300">
            {activeTab === 'URL' ? (
              <div className="space-y-4">
                <form onSubmit={handleAddUrl} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[var(--accent)] px-6 py-3 font-medium whitespace-nowrap text-[var(--accent-foreground)] shadow-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: TAB_ACTIVE }}
                  >
                    Add to Queue
                  </button>
                </form>
                {urlStatus.message && (
                  <p
                    className={`text-sm ${
                      urlStatus.type === 'error'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {urlStatus.message}
                  </p>
                )}
                {!urlInput && (
                  <p className="text-center text-sm text-[var(--muted-foreground)]">
                    URLs are processed one at a time. Enter multiple URLs and they&apos;ll be queued
                    automatically.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                      type="text"
                      placeholder={
                        activeTab === 'PAPER'
                          ? 'Search by title, keywords, or author...'
                          : 'Search by title or author...'
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-3 pr-4 pl-11 transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="flex items-center gap-2 rounded-lg px-6 py-3 font-medium whitespace-nowrap text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: TAB_ACTIVE }}
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Search
                  </button>
                </form>

                {isSearching && (
                  <p className="text-sm text-[var(--muted-foreground)]">Searching…</p>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="grid gap-3">
                    {searchResults.map((result, i) => (
                      <SearchResultCard
                        key={i}
                        result={result}
                        type={activeTab}
                        onClick={() => setSelectedResult(result)}
                      />
                    ))}
                  </div>
                )}

                {!isSearching && searchError && (
                  <div className="py-10 text-center text-amber-600 dark:text-amber-400">
                    <p>{searchError}</p>
                  </div>
                )}

                {!isSearching &&
                  hasSearched &&
                  !searchError &&
                  searchResults.length === 0 && (
                    <div className="py-10 text-center text-[var(--muted-foreground)]">
                      <p>
                        {activeTab === 'PAPER'
                          ? 'No papers found. Try different keywords.'
                          : 'No books found. Try a different title.'}
                      </p>
                    </div>
                  )}

                {!isSearching && !hasSearched && (
                  <div className="py-20 text-center text-[var(--muted-foreground)]">
                    <p>
                      {activeTab === 'PAPER'
                        ? 'Search for any research paper'
                        : 'Search for any book'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] pt-8 pb-20">
        <QueuePanel
          items={displayQueueItems}
          totalItems={queue.items.length}
          activeCount={activeQueueCount}
          showAll={queueShowAll}
          onToggleShowAll={() => setQueueShowAll((v) => !v)}
          onRemove={handleRemoveFromQueue}
          onRetry={handleRetryQueueItem}
        />
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
        active
          ? 'text-white shadow-md'
          : 'border border-[var(--border)] border-dashed bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]/40 hover:text-[var(--foreground)]'
      }`}
      style={active ? { backgroundColor: TAB_ACTIVE } : undefined}
    >
      {label}
    </button>
  );
}

function SearchResultCard({
  result,
  type,
  onClick,
}: {
  result: SearchResult;
  type: Tab;
  onClick: () => void;
}) {
  const displayAuthors =
    result.authors.length > 3
      ? `${result.authors.slice(0, 3).join(', ')} et al.`
      : result.authors.join(', ');

  const abstractSnippet =
    result.abstract && result.abstract.length > 150
      ? `${result.abstract.slice(0, 150)}…`
      : result.abstract || '';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-sm transition-all hover:bg-[var(--muted)]/30 hover:shadow-md"
    >
      {type === 'BOOK' && (
        <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-[var(--border)] bg-[var(--muted)]/50">
          {result.coverUrl ? (
            <img src={result.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--muted-foreground)]">
              <Book className="h-6 w-6" />
            </div>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 leading-tight font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">
            {result.title}
          </h3>
          {result.openAccessUrl && (
            <span className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
              Open Access
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">{displayAuthors}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)] italic opacity-80">
          {result.year ? `${result.year} · ` : ''}
          {result.source || result.publisher || ''}
          {result.pages != null ? ` · ${result.pages} pages` : ''}
        </p>
        {type === 'PAPER' && abstractSnippet && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)] opacity-70">
            {abstractSnippet}
          </p>
        )}
      </div>
    </button>
  );
}

function QueuePanel({
  items,
  totalItems,
  activeCount,
  showAll,
  onToggleShowAll,
  onRemove,
  onRetry,
}: {
  items: QueueItem[];
  totalItems: number;
  activeCount: number;
  showAll: boolean;
  onToggleShowAll: () => void;
  onRemove: (id: string) => void;
  onRetry: (item: QueueItem) => void;
}) {
  const heading =
    activeCount === 0 ? 'Your Queue (empty)' : 'Your Queue';

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          {heading}
          {activeCount > 0 && (
            <span
              className="min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] text-white"
              style={{ backgroundColor: TAB_ACTIVE }}
            >
              {activeCount}
            </span>
          )}
        </h2>
        {totalItems > 10 && (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="text-xs text-[var(--accent)] hover:underline"
            style={{ color: TAB_ACTIVE }}
          >
            {showAll ? 'Show less' : 'View all'}
          </button>
        )}
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] shadow-sm">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 bg-[var(--background)] p-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <StatusIcon status={item.status} />
              <div className="min-w-0">
                <div className="mb-0.5 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[var(--muted)] px-1 text-[10px] font-bold tracking-wider text-[var(--muted-foreground)] uppercase">
                    {inputTypeLabel(item.inputType)}
                  </span>
                  <span
                    className="max-w-[240px] truncate text-sm text-[var(--foreground)] sm:max-w-[360px]"
                    title={item.input}
                  >
                    {truncateInput(item.input)}
                  </span>
                </div>
                {item.status === 'FAILED' && item.errorMessage && (
                  <p className="truncate text-[11px] text-amber-600 dark:text-amber-500">
                    {item.errorMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
              {item.status === 'PENDING' && (
                <span className="text-xs text-[var(--muted-foreground)]">Waiting…</span>
              )}
              {item.status === 'PROCESSING' && (
                <span className="text-xs text-[var(--muted-foreground)]">Processing…</span>
              )}
              {item.status === 'COMPLETED' && item.entryId && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  Saved →{' '}
                  <Link
                    href={`/entries/${item.entryId}`}
                    className="text-[var(--accent)] hover:underline"
                    style={{ color: TAB_ACTIVE }}
                  >
                    View Entry
                  </Link>
                </span>
              )}
              {item.status === 'FAILED' && (
                <button
                  type="button"
                  onClick={() => onRetry(item)}
                  className="rounded bg-[var(--accent)]/10 px-2 py-1 text-xs font-medium text-[var(--accent)] transition-colors hover:opacity-80"
                  style={{ color: TAB_ACTIVE }}
                >
                  Retry
                </button>
              )}
              {item.status === 'PENDING' && <RemoveConfirmButton onRemove={() => onRemove(item.id)} />}
            </div>
          </div>
        ))}

        {totalItems === 0 && (
          <div className="bg-[var(--background)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            No items in your queue. Add papers, books, or URLs above.
          </div>
        )}
      </div>
    </div>
  );
}

function RemoveConfirmButton({ onRemove }: { onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Remove?</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded bg-red-500/10 px-2 py-1 text-xs font-bold text-red-600 dark:text-red-400"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="p-1 text-[var(--muted-foreground)] transition-colors hover:text-red-500"
      aria-label="Remove from queue"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function PreviewForm({
  item,
  type,
  onBack,
  onSave,
}: {
  item: SearchResult;
  type: Tab;
  onBack: () => void;
  onSave: (id: string, title: string, authors: string[], url: string | null) => void;
}) {
  const [formData, setFormData] = useState({
    title: item.title,
    authors: item.authors.join(', '),
    year: item.year ?? ('' as string | number),
    contentType: type === 'PAPER' ? 'PAPER' : 'BOOK',
    abstract: item.abstract || '',
    source: item.source || item.publisher || '',
    doi: item.doi || '',
    url: item.openAccessUrl || '',
    isbn: item.isbn || '',
    readingStatus: 'UNREAD',
    notes: '',
  });
  const [showMore, setShowMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!formData.title) return;
    setIsSaving(true);
    setError(null);

    const authorsArr = formData.authors
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      const payload = {
        title: formData.title,
        authors: authorsArr,
        year: formData.year === '' || formData.year === null ? null : parseInt(String(formData.year), 10),
        contentType: formData.contentType,
        source: formData.source || null,
        abstract: formData.abstract || null,
        doi: formData.doi || null,
        url: formData.url || null,
        isbn: formData.isbn || null,
        readingStatus: formData.readingStatus,
        notes: formData.notes
          ? [{ text: formData.notes, createdAt: new Date().toISOString() }]
          : [],
        metadata: {
          externalId: item.semanticScholarId || item.openLibraryKey,
          pages: item.pages,
          coverUrl: item.coverUrl,
        },
      };

      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: type,
          input: formData.title,
          payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.error === 'entry_limit_reached') {
          throw new Error('LIMIT_REACHED');
        }
        if (res.status === 409 && data.error === 'ALREADY_EXISTS') {
          throw new Error('ALREADY_EXISTS');
        }
        throw new Error(data.error || data.message || 'Failed to save');
      }

      const entryId = data.queueItem?.entryId as string | undefined;
      if (!entryId) throw new Error('Missing entry id');
      onSave(entryId, formData.title, authorsArr, formData.url || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      if (msg === 'LIMIT_REACHED') setError('LIMIT');
      else if (msg === 'ALREADY_EXISTS') setError('EXISTS');
      else setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />← Back to results
      </button>

      {error === 'LIMIT' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
          You&apos;ve reached the 100 entry limit on the free plan.{' '}
          <Link href="/pricing" className="font-bold underline">
            Upgrade to Pro →
          </Link>
        </div>
      )}

      {error === 'EXISTS' && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-600 dark:text-blue-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Already in your library</p>
            <p className="opacity-80">This paper or book has already been saved.</p>
          </div>
          <Link href="/library" className="text-xs font-bold whitespace-nowrap underline">
            Open Library
          </Link>
        </div>
      )}

      {error && error !== 'LIMIT' && error !== 'EXISTS' && (
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-md">
        <Field label="Title" required>
          <input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
          />
        </Field>

        <Field label="Authors" hint="Separate multiple authors with commas">
          <input
            value={formData.authors}
            onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
          <Field label="Year">
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="w-full max-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
            />
          </Field>
          <Field label="Content Type">
            <select
              value={formData.contentType}
              onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
              className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
            >
              <option value="PAPER">Research Paper</option>
              <option value="BOOK">Book</option>
              <option value="ARTICLE">Article</option>
              <option value="BLOG">Blog</option>
              <option value="ESSAY">Essay</option>
              <option value="POLICY_REPORT">Policy Report</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
        </div>

        <Field label="Reading Status">
          <select
            value={formData.readingStatus}
            onChange={(e) => setFormData({ ...formData, readingStatus: e.target.value })}
            className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
          >
            <option value="UNREAD">Unread</option>
            <option value="READING">Reading</option>
            <option value="READ">Completed</option>
            <option value="DROPPED">Dropped</option>
          </select>
        </Field>

        <Field label={type === 'PAPER' ? 'Abstract' : 'Description'}>
          <textarea
            rows={4}
            value={formData.abstract}
            onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
            placeholder="Add a description..."
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
          />
        </Field>

        {item.openAccessUrl && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Free full text available →{' '}
            <a
              href={item.openAccessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Open link
            </a>
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1 py-2 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--accent)]"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          {showMore ? 'Fewer details' : 'More details'}
        </button>

        {showMore && (
          <div className="animate-in fade-in zoom-in-95 space-y-4 duration-200">
            <Field label="Source / Publisher">
              <input
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {type === 'PAPER' && (
                <Field label="DOI">
                  <input
                    value={formData.doi}
                    onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                    readOnly={!!item.doi}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] opacity-80 focus:outline-none"
                  />
                </Field>
              )}
              {type === 'BOOK' && (
                <Field label="ISBN">
                  <input
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
                  />
                </Field>
              )}
              {type === 'PAPER' && item.openAccessUrl ? (
                <Field label="Open Access URL">
                  <input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
                  />
                </Field>
              ) : null}
            </div>

            <Field label="Notes">
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Personal notes..."
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
              />
            </Field>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !formData.title}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-lg transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
          style={{ backgroundColor: TAB_ACTIVE }}
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Save to Library
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold tracking-widest text-[var(--muted-foreground)] uppercase">
        <label>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {hint && <span className="font-normal normal-case">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function PostSavePanel({
  confirmation,
  onAddAnother,
  apiKey,
  onViewEntry,
}: {
  confirmation: { id: string; title: string; authors: string[]; url: string | null };
  onAddAnother: () => void;
  apiKey: string;
  onViewEntry: () => void;
}) {
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionMsg, setCollectionMsg] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/collections', {
          headers: { 'x-api-key': apiKey },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const owned = Array.isArray(data.owned) ? data.owned : [];
        const member = Array.isArray(data.member) ? data.member : [];
        const byId = new Map<string, string>();
        for (const c of owned) {
          if (c?.id && c?.name) byId.set(c.id, c.name);
        }
        for (const c of member) {
          if (c?.id && c?.name) byId.set(c.id, c.name);
        }
        if (!cancelled) {
          setCollections(Array.from(byId.entries(), ([id, name]) => ({ id, name })));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const addToCollection = async (collectionId: string, name: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ entryId: confirmation.id }),
      });
      if (res.ok) {
        setCollectionMsg(`Added to ${name} ✓`);
        setCollectionOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        setCollectionMsg(err.error || 'Could not add to collection');
      }
    } catch {
      setCollectionMsg('Could not add to collection');
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 flex flex-col items-center py-12 duration-700">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border shadow-inner"
        style={{ borderColor: TAB_ACTIVE, color: TAB_ACTIVE }}
      >
        <Check className="h-10 w-10" strokeWidth={2.5} />
      </div>
      <h2 className="mb-2 font-serif text-2xl font-bold text-[var(--foreground)]">
        Saved to your library
      </h2>
      <p className="mb-10 max-w-[400px] text-center text-[var(--muted-foreground)]">{confirmation.title}</p>

      {collectionMsg && (
        <p className="mb-4 text-sm text-[var(--muted-foreground)]">{collectionMsg}</p>
      )}

      <div className="mb-12 flex flex-wrap justify-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setCollectionOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
          >
            + Add to Collection <ChevronDown className="h-4 w-4" />
          </button>
          {collectionOpen && (
            <div className="absolute top-full right-0 z-20 mt-1 max-h-48 min-w-[200px] overflow-auto rounded-md border border-[var(--border)] bg-[var(--background)] shadow-lg">
              {collections.length === 0 ? (
                <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">No collections yet</div>
              ) : (
                collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--muted)]"
                    onClick={() => addToCollection(c.id, c.name)}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
        >
          Share <Share2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onViewEntry}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
          style={{ backgroundColor: TAB_ACTIVE }}
        >
          View Entry <ExternalLink className="h-4 w-4" />
        </button>
      </div>

      <ShareEntryModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        entry={{
          id: confirmation.id,
          title: confirmation.title,
          authors: confirmation.authors,
          url: confirmation.url ?? undefined,
        }}
      />

      <button
        type="button"
        onClick={onAddAnother}
        className="text-sm font-medium hover:underline"
        style={{ color: TAB_ACTIVE }}
      >
        Add another
      </button>
    </div>
  );
}
