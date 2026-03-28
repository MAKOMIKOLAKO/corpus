'use client'

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Book, 
  FileText, 
  Link as LinkIcon, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  X,
  Share2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- Types ---
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

// --- Icons ---
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'PENDING': return <Clock className="w-4 h-4 text-[var(--muted-foreground)]" />;
    case 'PROCESSING': return <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />;
    case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
    default: return null;
  }
};

// --- Components ---

export default function AddEntryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('PAPER');
  const [queue, setQueue] = useState<{ items: QueueItem[]; processingCount: number; pendingCount: number }>({
    items: [],
    processingCount: 0,
    pendingCount: 0
  });
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [urlStatus, setUrlStatus] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  
  // Selected item / Preview state
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveConfirmation, setSaveConfirmation] = useState<{ id: string; title: string } | null>(null);

  // --- Queue Polling ---
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => {
      const hasActive = queue.items.some(item => item.status === 'PENDING' || item.status === 'PROCESSING');
      if (hasActive) {
        fetchQueue();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [queue.items.length]);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/queue');
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      }
    } catch (err) {
      console.error('Failed to fetch queue', err);
    }
  };

  const handleRemoveFromQueue = async (id: string) => {
    try {
      const res = await fetch(`/api/queue/${id}`, { method: 'DELETE' });
      if (res.ok) fetchQueue();
    } catch (err) {
      console.error('Failed to delete queue item', err);
    }
  };

  const handleRetryQueueItem = async (item: QueueItem) => {
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputType: item.inputType,
          input: item.input,
          payload: null
        })
      });
      if (res.ok) fetchQueue();
    } catch (err) {
      console.error('Failed to retry queue item', err);
    }
  };

  // --- Search Logic ---
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.length < (activeTab === 'PAPER' ? 3 : 2)) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    
    const endpoint = activeTab === 'PAPER' ? '/api/add/papers' : '/api/add/books';
    try {
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setSearchResults(data.results);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // --- URL Logic ---
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
        body: JSON.stringify({ inputType: 'URL', input: urlInput, payload: null })
      });
      if (!res.ok) throw new Error('Failed to add to queue');
      
      setUrlInput('');
      setUrlStatus({ message: 'Added to queue ✓', type: 'success' });
      setTimeout(() => setUrlStatus({ message: '', type: null }), 2000);
      fetchQueue();
    } catch (err: any) {
      setUrlStatus({ message: err.message, type: 'error' });
    }
  };

  // --- Reset View ---
  const resetToDefault = () => {
    setSaveConfirmation(null);
    setSelectedResult(null);
    setSearchResults([]);
    setSearchQuery('');
    setActiveTab('PAPER');
  };

  return (
    <div className="max-w-[720px] mx-auto p-6 min-h-screen bg-[var(--background)] text-[var(--foreground)] theme-transition">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-serif mb-6 text-[var(--foreground)]">Add to Library</h1>
        
        {!selectedResult && !saveConfirmation && (
          <div className="flex gap-2 p-1 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)]">
            <TabButton 
              active={activeTab === 'PAPER'} 
              onClick={() => { setActiveTab('PAPER'); setSearchResults([]); setSearchQuery(''); }}
              icon={<Plus className="w-4 h-4" />}
              label="Research Paper"
            />
            <TabButton 
              active={activeTab === 'BOOK'} 
              onClick={() => { setActiveTab('BOOK'); setSearchResults([]); setSearchQuery(''); }}
              icon={<Book className="w-4 h-4" />}
              label="Book"
            />
            <TabButton 
              active={activeTab === 'URL'} 
              onClick={() => { setActiveTab('URL'); setSearchResults([]); setSearchQuery(''); }}
              icon={<LinkIcon className="w-4 h-4" />}
              label="URL / Article"
            />
          </div>
        )}
      </header>

      <main className="mb-12">
        {saveConfirmation ? (
          <PostSavePanel confirmation={saveConfirmation} onAddAnother={resetToDefault} />
        ) : selectedResult ? (
          <PreviewForm 
            item={selectedResult} 
            type={activeTab} 
            onBack={() => setSelectedResult(null)} 
            onSave={(id, title) => setSaveConfirmation({ id, title })}
          />
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeTab === 'URL' ? (
              <div className="space-y-4">
                <form onSubmit={handleAddUrl} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  />
                  <button 
                    type="submit"
                    className="bg-[var(--accent)] hover:opacity-90 text-[var(--accent-foreground)] px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap shadow-sm"
                  >
                    Add to Queue
                  </button>
                </form>
                {urlStatus.message && (
                  <p className={`text-sm ${urlStatus.type === 'error' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {urlStatus.message}
                  </p>
                )}
                <p className="text-sm text-[var(--muted-foreground)] text-center">
                  URLs are processed one at a time. Enter multiple URLs and they'll be queued automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input
                      type="text"
                      placeholder={activeTab === 'PAPER' ? "Search by title, keywords, or author..." : "Search by title or author..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSearching}
                    className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-[var(--accent-foreground)] px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </button>
                </form>

                {isSearching ? (
                  <div className="py-20 flex flex-col items-center justify-center text-[var(--muted-foreground)] gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                    <p>Searching for {activeTab === 'PAPER' ? 'papers' : 'books'}...</p>
                  </div>
                ) : searchResults.length > 0 ? (
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
                ) : searchError ? (
                  <div className="py-10 text-center text-amber-600 dark:text-amber-400">
                    <p>{searchError}</p>
                  </div>
                ) : (
                  <div className="py-20 text-center text-[var(--muted-foreground)]">
                    <p>Search for any {activeTab === 'PAPER' ? 'research paper' : 'book'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] pt-8 pb-20">
        <QueuePanel queue={queue} onRemove={handleRemoveFromQueue} onRetry={handleRetryQueueItem} />
      </footer>
    </div>
  );
}

// --- Sub-components ---

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md' 
          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SearchResultCard({ result, type, onClick }: { result: SearchResult, type: Tab, onClick: () => void }) {
  const displayAuthors = result.authors.length > 3 
    ? result.authors.slice(0, 3).join(', ') + ' et al.' 
    : result.authors.join(', ');

  return (
    <button 
      onClick={onClick}
      className="w-full text-left p-4 bg-[var(--card)] hover:bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl transition-all group flex gap-4 shadow-sm hover:shadow-md"
    >
      {type === 'BOOK' && (
        <div className="w-12 h-16 bg-[var(--muted)]/50 rounded flex-shrink-0 overflow-hidden border border-[var(--border)]">
          {result.coverUrl ? (
            <img src={result.coverUrl} alt={result.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)]">
              <Book className="w-6 h-6" />
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-tight">
            {result.title}
          </h3>
          {result.openAccessUrl && (
            <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-500/20">
              Open Access
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mt-1 truncate">{displayAuthors}</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1 italic opacity-80">
          {result.year ? `${result.year} · ` : ''}{result.source || result.publisher || ''}
          {result.pages ? ` · ${result.pages} pages` : ''}
        </p>
        {result.abstract && (
          <p className="text-xs text-[var(--muted-foreground)] mt-2 line-clamp-2 leading-relaxed opacity-70">
            {result.abstract}
          </p>
        )}
      </div>
    </button>
  );
}

function QueuePanel({ queue, onRemove, onRetry }: { 
  queue: { items: QueueItem[]; processingCount: number; pendingCount: number },
  onRemove: (id: string) => void,
  onRetry: (item: QueueItem) => void
}) {
  const activeCount = queue.processingCount + queue.pendingCount;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--foreground)]">
          Your Queue
          {activeCount > 0 && (
            <span className="bg-[var(--accent)] text-[var(--accent-foreground)] text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {activeCount}
            </span>
          )}
        </h2>
        {queue.items.length === 0 && <span className="text-xs text-[var(--muted-foreground)] italic">(empty)</span>}
        {queue.items.length > 10 && <Link href="/library/queue" className="text-xs text-[var(--accent)] hover:underline">View all</Link>}
      </div>

      <div className="grid gap-px bg-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm">
        {queue.items.slice(0, 10).map((item) => (
          <div key={item.id} className="bg-[var(--background)] p-3 flex items-center justify-between gap-4 group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                <StatusIcon status={item.status} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)] px-1 bg-[var(--muted)] rounded">
                    {item.inputType.toLowerCase()}
                  </span>
                  <span className="text-sm text-[var(--foreground)] truncate max-w-[300px]" title={item.input}>
                    {item.input}
                  </span>
                </div>
                {item.status === 'FAILED' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-500 truncate">{item.errorMessage}</p>
                )}
                {item.status === 'COMPLETED' && item.entryId && (
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Saved → <Link href={`/entries/${item.entryId}`} className="text-[var(--accent)] hover:underline">View Entry</Link>
                  </p>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2">
               {item.status === 'FAILED' && (
                 <button 
                  onClick={() => onRetry(item)}
                  className="text-xs text-[var(--accent)] hover:opacity-80 font-medium px-2 py-1 rounded bg-[var(--accent)]/10 transition-colors"
                 >
                   Retry
                 </button>
               )}
               {(item.status === 'PENDING' || item.status === 'FAILED' || item.status === 'COMPLETED') && (
                 <RemoveConfirmButton onRemove={() => onRemove(item.id)} />
               )}
               {item.status === 'PROCESSING' && (
                 <span className="text-xs text-[var(--muted-foreground)] italic">Processing...</span>
               )}
            </div>
          </div>
        ))}

        {queue.items.length === 0 && (
          <div className="bg-[var(--background)] p-8 text-center text-[var(--muted-foreground)] text-sm">
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
        <span className="text-[10px] text-[var(--muted-foreground)] font-bold uppercase">Remove?</span>
        <button 
          onClick={onRemove}
          className="text-xs text-red-600 dark:text-red-400 hover:opacity-80 font-bold px-2 py-1 bg-red-500/10 rounded"
        >
          Yes
        </button>
        <button 
          onClick={() => setConfirming(false)}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }
  
  return (
    <button 
      onClick={() => setConfirming(true)}
      className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors p-1"
    >
      <X className="w-4 h-4" />
    </button>
  );
}

function PreviewForm({ item, type, onBack, onSave }: { 
  item: SearchResult, 
  type: Tab, 
  onBack: () => void,
  onSave: (id: string, title: string) => void
}) {
  const [formData, setFormData] = useState({
    title: item.title,
    authors: item.authors.join(', '),
    year: item.year || '',
    contentType: type === 'PAPER' ? 'PAPER' : 'BOOK',
    abstract: item.abstract || '',
    source: item.source || item.publisher || '',
    doi: item.doi || '',
    url: item.openAccessUrl || '',
    isbn: item.isbn || '',
    readingStatus: 'UNREAD',
    notes: ''
  });
  const [showMore, setShowMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!formData.title) return;
    setIsSaving(true);
    setError(null);
    
    try {
      const payload = {
        title: formData.title,
        authors: formData.authors.split(',').map(a => a.trim()).filter(Boolean),
        year: formData.year ? parseInt(formData.year.toString()) : null,
        contentType: formData.contentType,
        source: formData.source || null,
        abstract: formData.abstract || null,
        doi: formData.doi || null,
        url: formData.url || null,
        isbn: formData.isbn || null,
        readingStatus: formData.readingStatus,
        notes: formData.notes ? [{ text: formData.notes, createdAt: new Date().toISOString() }] : [],
        metadata: {
          externalId: item.semanticScholarId || item.openLibraryKey,
          pages: item.pages,
          coverUrl: item.coverUrl
        }
      };

      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          inputType: type, 
          input: item.title, 
          payload 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.error === 'entry_limit_reached') {
          throw new Error('LIMIT_REACHED');
        }
        if (res.status === 409 && data.error === 'ALREADY_EXISTS') {
          throw new Error('ALREADY_EXISTS');
        }
        throw new Error(data.error || 'Failed to save');
      }

      onSave(data.queueItem.entryId, formData.title);
    } catch (err: any) {
      if (err.message === 'LIMIT_REACHED') {
        setError('LIMIT');
      } else if (err.message === 'ALREADY_EXISTS') {
        setError('EXISTS');
      } else {
        setError(err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to results
      </button>

      {error === 'LIMIT' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-sm">
          You've reached the 100 entry limit on the free plan.{' '}
          <Link href="/billing" className="font-bold underline">Upgrade to Pro →</Link>
        </div>
      )}

      {error === 'EXISTS' && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <div className="flex-1">
            <p className="font-semibold">Already in your library</p>
            <p className="opacity-80">This paper or book has already been saved.</p>
          </div>
          <Link href="/library" className="text-xs font-bold underline whitespace-nowrap">Open Library</Link>
        </div>
      )}
      
      {error && error !== 'LIMIT' && error !== 'EXISTS' && (
        <div className="p-3 text-red-600 dark:text-red-400 text-sm bg-red-500/5 border border-red-500/10 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4 bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-md">
        <Field label="Title" required>
          <input 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all"
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Field label="Authors" hint="Separate with commas">
              <input 
                value={formData.authors} 
                onChange={e => setFormData({...formData, authors: e.target.value})}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all"
              />
            </Field>
          </div>
          <Field label="Year">
            <input 
              type="number"
              value={formData.year} 
              onChange={e => setFormData({...formData, year: e.target.value})}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Content Type">
            <select 
              value={formData.contentType}
              onChange={e => setFormData({...formData, contentType: e.target.value})}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none appearance-none transition-all"
            >
              <option value="PAPER">Research Paper</option>
              <option value="BOOK">Book</option>
              <option value="ARTICLE">Article</option>
              <option value="BLOG">Blog Post</option>
              <option value="ESSAY">Essay</option>
              <option value="POLICY_REPORT">Policy Report</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Reading Status">
            <select 
              value={formData.readingStatus}
              onChange={e => setFormData({...formData, readingStatus: e.target.value})}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none appearance-none transition-all"
            >
              <option value="UNREAD">Unread</option>
              <option value="READING">Reading</option>
              <option value="READ">Completed</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </Field>
        </div>

        <Field label={type === 'PAPER' ? 'Abstract' : 'Description'}>
          <textarea 
            rows={4}
            value={formData.abstract}
            onChange={e => setFormData({...formData, abstract: e.target.value})}
            placeholder="Add a description..."
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none resize-none transition-all"
          />
        </Field>

        {item.openAccessUrl && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Free full text available → <a href={item.openAccessUrl} target="_blank" className="underline hover:no-underline">Open link</a>
          </p>
        )}

        <button 
          onClick={() => setShowMore(!showMore)}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--accent)] flex items-center gap-1 py-2 transition-colors"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          {showMore ? 'Show fewer details' : 'More details'}
        </button>

        {showMore && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <Field label="Source / Publisher">
              <input 
                value={formData.source} 
                onChange={e => setFormData({...formData, source: e.target.value})}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              {type === 'PAPER' && (
                <Field label="DOI">
                  <input 
                    value={formData.doi} 
                    onChange={e => setFormData({...formData, doi: e.target.value})}
                    readOnly={!!item.doi}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] opacity-80"
                  />
                </Field>
              )}
               {type === 'BOOK' && (
                <Field label="ISBN">
                  <input 
                    value={formData.isbn} 
                    onChange={e => setFormData({...formData, isbn: e.target.value})}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  />
                </Field>
              )}
               <Field label={type === 'PAPER' ? 'Open Access URL' : 'URL'}>
                <input 
                  value={formData.url} 
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                />
              </Field>
            </div>

            <Field label="Personal Notes">
              <textarea 
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Personal notes..."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none resize-none transition-all"
              />
            </Field>
          </div>
        )}

        <button 
          onClick={handleSave}
          disabled={isSaving || !formData.title}
          className="w-full bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-[var(--accent-foreground)] py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--accent)]/10 mt-4 active:scale-[0.98]"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save to Library'}
        </button>
      </div>
    </div>
  );
}

function PostSavePanel({ confirmation, onAddAnother }: { confirmation: { id: string, title: string }, onAddAnother: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-700">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-[var(--foreground)] font-serif">Saved to your library</h2>
      <p className="text-[var(--muted-foreground)] mb-10 text-center max-w-[400px]">{confirmation.title}</p>
      
      <div className="flex gap-3 mb-12">
        <button className="flex items-center gap-2 bg-[var(--background)] hover:bg-[var(--muted)] px-4 py-2.5 rounded-lg border border-[var(--border)] transition-colors text-sm font-medium">
          Add to Collection <ChevronDown className="w-4 h-4" />
        </button>
        <button className="flex items-center gap-2 bg-[var(--background)] hover:bg-[var(--muted)] px-4 py-2.5 rounded-lg border border-[var(--border)] transition-colors text-sm font-medium">
          Share <Share2 className="w-4 h-4" />
        </button>
        <Link 
          href={`/entries/${confirmation.id}`}
          className="flex items-center gap-2 bg-[var(--accent)] hover:opacity-90 text-[var(--accent-foreground)] px-4 py-2.5 rounded-lg transition-all text-sm font-medium shadow-sm"
        >
          View Entry <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
      
      <button 
        onClick={onAddAnother}
        className="text-[var(--accent)] hover:underline font-medium text-sm underline-offset-4"
      >
        Add another
      </button>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string, required?: boolean, hint?: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
        <label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {hint && <span>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
