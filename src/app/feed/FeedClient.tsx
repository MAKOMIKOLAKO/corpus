'use client';

import React from 'react';
import { SignalType, Plan } from '@prisma/client';
import {
  UserPlus,
  BookOpen,
  Folder,
  Share2,
  Sparkles,
  ExternalLink,
  Rss,
  Bookmark,
  Plus,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { AddFeedDialog } from './AddFeedDialog';

interface FeedSignal {
  id: string;
  type: SignalType | 'ENTRY_ADDED_TO_COLLECTION' | 'COLLECTION_MEMBER_JOINED' | 'ENTRY_CREATED' | 'COLLECTION_CREATED';
  createdAt: Date | string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image?: string | null;
  };
  entry?: {
    id: string;
    title: string;
  } | null;
  collection?: {
    id: string;
    name: string;
  } | null;
  metadata?: any;
}

interface RSSEntry {
  id: string;
  title: string;
  authors: string[];
  summary: string | null;
  source: string | null;
  url: string | null;
  createdAt: string;
  publicationYear: number | null;
  addedAt: string;
}

interface UserFeed {
  id: string;
  feedUrl: string;
  title: string | null;
  domain: string;
  lastFetchedAt: Date | null;
  addedAt: Date;
}

interface FeedClientProps {
  signals: FeedSignal[];
  userPlan: Plan;
  rssEntries?: RSSEntry[];
  userFeeds?: UserFeed[];
  initialRssPageSize?: number;
  initialRssHasMore?: boolean;
}

type FeedView = 'actions' | 'rss';

const RSSEntryCard = React.memo(function RSSEntryCard({ entry }: { entry: RSSEntry }) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [isAdded, setIsAdded] = React.useState(false);

  const handleAddToLibrary = React.useCallback(async () => {
    if (isAdded || isAdding) return;

    setIsAdding(true);
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: entry.title,
          authors: entry.authors,
          year: entry.publicationYear,
          abstract: entry.summary,
          source: 'MANUAL',
          contentType: 'ARTICLE',
          url: entry.url,
          readingStatus: 'UNREAD'
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((data as { error?: string })?.error || 'Failed to add to library');
      }

      if (data.isDuplicate) {
        toast.error('This entry is already in your library');
      } else {
        toast.success('Added to library');
        setIsAdded(true);
      }
    } catch (error) {
      console.error('Error adding feed entry to library:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add to library');
    } finally {
      setIsAdding(false);
    }
  }, [entry, isAdded, isAdding]);

  return (
    <div className="group flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-all">
      <div className="mt-1">
        <Rss size={18} className="text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {entry.title}
          </h3>
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>

        {entry.authors.length > 0 && (
          <p className="text-sm text-muted-foreground mb-2">
            {entry.authors.slice(0, 3).join(', ')}
            {entry.authors.length > 3 && ' et al.'}
          </p>
        )}

        {entry.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {entry.summary}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {entry.source && (
              <span>{entry.source}</span>
            )}
            <span>{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</span>
          </div>
          <button
            onClick={handleAddToLibrary}
            disabled={isAdding || isAdded}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-all touch-manipulation ${isAdded
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
              : 'bg-background border-border hover:bg-muted hover:text-foreground'
              }`}
          >
            {isAdding ? (
              <>
                <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent" />
                Adding...
              </>
            ) : isAdded ? (
              <>
                <Bookmark size={12} className="fill-current" />
                Added
              </>
            ) : (
              <>
                <Plus size={12} />
                Add to library
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default function FeedClient({
  signals,
  userPlan,
  rssEntries = [],
  userFeeds = [],
  initialRssPageSize = 20,
  initialRssHasMore = false,
}: FeedClientProps) {
  const isFree = userPlan === 'FREE';
  const rssPageSize = initialRssPageSize > 0 ? initialRssPageSize : 20;
  const [upgradePromptShown, setUpgradePromptShown] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [feedList, setFeedList] = React.useState(userFeeds);
  const [showManageFeeds, setShowManageFeeds] = React.useState(false);
  const [activeView, setActiveView] = React.useState<FeedView>('actions');
  const [rssFeedEntries, setRssFeedEntries] = React.useState<RSSEntry[]>(rssEntries);
  const [rssPage, setRssPage] = React.useState(1);
  const [rssHasMore, setRssHasMore] = React.useState(initialRssHasMore);
  const [isLoadingMoreRss, setIsLoadingMoreRss] = React.useState(false);
  const [rssLoadError, setRssLoadError] = React.useState<string | null>(null);
  const loadMoreTriggerRef = React.useRef<HTMLDivElement | null>(null);

  const sortedSignals = React.useMemo(
    () => [...signals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [signals]
  );

  const sortedRssEntries = React.useMemo(
    () => [...rssFeedEntries].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()),
    [rssFeedEntries]
  );

  React.useEffect(() => {
    setRssFeedEntries(rssEntries);
    setRssPage(1);
    setRssHasMore(initialRssHasMore);
    setRssLoadError(null);
  }, [rssEntries, initialRssHasMore]);

  const loadMoreRssEntries = React.useCallback(async () => {
    if (isLoadingMoreRss || !rssHasMore) {
      return;
    }

    const nextPage = rssPage + 1;
    setIsLoadingMoreRss(true);

    try {
      const response = await fetch(`/api/feed?filter=rss&page=${nextPage}&limit=${rssPageSize}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((data as { error?: string })?.error || 'Failed to load more RSS entries');
      }

      const entries = Array.isArray((data as { entries?: RSSEntry[] }).entries)
        ? (data as { entries: RSSEntry[] }).entries
        : [];

      setRssFeedEntries((prev) => {
        const seenIds = new Set(prev.map((entry) => entry.id));
        const dedupedNewEntries = entries.filter((entry) => !seenIds.has(entry.id));
        return [...prev, ...dedupedNewEntries];
      });

      setRssPage(nextPage);
      setRssHasMore(Boolean((data as { hasMore?: boolean }).hasMore));
      setRssLoadError(null);
    } catch (error) {
      setRssLoadError(error instanceof Error ? error.message : 'Failed to load more RSS entries');
    } finally {
      setIsLoadingMoreRss(false);
    }
  }, [isLoadingMoreRss, rssHasMore, rssPage, rssPageSize]);

  React.useEffect(() => {
    if (activeView !== 'rss' || !rssHasMore) {
      return;
    }

    const triggerElement = loadMoreTriggerRef.current;
    if (!triggerElement) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreRssEntries();
        }
      },
      { root: null, rootMargin: '300px 0px', threshold: 0 }
    );

    observer.observe(triggerElement);

    return () => {
      observer.disconnect();
    };
  }, [activeView, rssHasMore, loadMoreRssEntries]);

  const handleAddFeed = React.useCallback((newFeed: {
    id: string;
    feedUrl: string;
    title: string | null;
    domain: string;
  }) => {
    setFeedList(prev => [{ ...newFeed, lastFetchedAt: null, addedAt: new Date() }, ...prev]);
    setIsAddDialogOpen(false);
    toast.success('Feed added successfully');
  }, []);

  const handleRemoveFeed = React.useCallback(async (feedId: string) => {
    try {
      const response = await fetch(`/api/feeds/${feedId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to remove feed');
      }

      setFeedList(prev => prev.filter(f => f.id !== feedId));
      toast.success('Feed removed successfully');
    } catch (error) {
      console.error('Error removing feed:', error);
      toast.error('Failed to remove feed');
    }
  }, []);

  const renderSignalIcon = React.useCallback((type: string) => {
    switch (type) {
      case 'ENTRY_CREATED': return <BookOpen size={18} className="text-blue-500" />;
      case 'ENTRY_ADDED_TO_COLLECTION': return <Folder size={18} className="text-green-500" />;
      case 'COLLECTION_CREATED': return <Folder size={18} className="text-green-500" />;
      case 'COLLECTION_MEMBER_JOINED': return <UserPlus size={18} className="text-purple-500" />;
      case 'ENTRY_SHARED': return <Share2 size={18} className="text-orange-500" />;
      default: return <Sparkles size={18} className="text-gray-400" />;
    }
  }, []);

  const renderSignalContent = React.useCallback((signal: FeedSignal) => {
    const userName = signal.user.name || signal.user.username || 'Someone';

    switch (signal.type) {
      case 'ENTRY_CREATED':
        return (
          <div className="flex flex-col gap-1">
            <p className="text-sm">
              <span className="font-semibold text-foreground">{userName}</span> added a new entry
            </p>
            {signal.entry && (
              <Link
                href={`/entries/${signal.entry.id}`}
                className="group flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors mt-2"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <h4 className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {signal.entry.title}
                  </h4>
                </div>
                <ExternalLink size={14} className="text-muted-foreground shrink-0" />
              </Link>
            )}
          </div>
        );

      case 'ENTRY_ADDED_TO_COLLECTION':
        const isSharedCollection = signal.metadata?.collectionIsShared;
        return (
          <div className="flex flex-col gap-1">
            <p className="text-sm">
              <span className="font-semibold text-foreground">{userName}</span> added an entry to{' '}
              <Link
                href={signal.metadata?.collectionIsPublic && signal.metadata?.collectionSlug ? `/c/${signal.metadata.collectionSlug}` : `/collections/${signal.collection?.id}`}
                className="font-semibold text-primary hover:underline underline-offset-2"
              >
                {signal.metadata?.collectionName || signal.collection?.name || 'Untitled Collection'}
              </Link>
            </p>
            {signal.entry && (
              <div className="group flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors mt-2">
                <div className="flex-1 min-w-0 mr-4">
                  <h4 className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {signal.entry.title}
                  </h4>
                </div>
                <ExternalLink size={14} className="text-muted-foreground shrink-0" />
              </div>
            )}
            {/* Inline upgrade prompt for free users */}
            {isFree && !upgradePromptShown && isSharedCollection && (
              <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10">
                <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                  Want to create your own shared collections?
                  <Link
                    href="/pricing"
                    className="font-semibold text-amber-600 dark:text-amber-400 hover:underline ml-1"
                    onClick={() => setUpgradePromptShown(true)}
                  >
                    Upgrade to Pro →
                  </Link>
                </p>
              </div>
            )}
          </div>
        );

      case 'COLLECTION_MEMBER_JOINED':
        return (
          <div className="flex flex-col gap-1">
            <p className="text-sm">
              <span className="font-semibold text-foreground">{userName}</span> joined{' '}
              <Link
                href={signal.metadata?.collectionIsPublic && signal.collection?.id ? `/collections/${signal.collection.id}` : `/collections/${signal.collection?.id}`}
                className="font-semibold text-primary hover:underline underline-offset-2"
              >
                {signal.metadata?.collectionName || signal.collection?.name || 'Untitled Collection'}
              </Link>
            </p>
            {/* Inline upgrade prompt for free users */}
            {isFree && !upgradePromptShown && signal.metadata?.collectionIsPublic && (
              <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10">
                <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                  Want to create your own shared collections?
                  <Link
                    href="/pricing"
                    className="font-semibold text-amber-600 dark:text-amber-400 hover:underline ml-1"
                    onClick={() => setUpgradePromptShown(true)}
                  >
                    Upgrade to Pro →
                  </Link>
                </p>
              </div>
            )}
          </div>
        );

      case 'COLLECTION_CREATED':
        return (
          <p className="text-sm">
            <span className="font-semibold text-foreground">{userName}</span> created a new collection{' '}
            <Link
              href={`/collections/${signal.collection?.id}`}
              className="font-semibold text-primary hover:underline underline-offset-2"
            >
              {signal.collection?.name || 'Untitled Collection'}
            </Link>
          </p>
        );

      default:
        return (
          <p className="text-sm">
            <span className="font-semibold text-foreground">{userName}</span> performed an action: {signal.type.replace(/_/g, ' ').toLowerCase()}
          </p>
        );
    }
  }, [isFree, upgradePromptShown]);

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">feed</h1>
          <button
            onClick={() => setShowManageFeeds(!showManageFeeds)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings size={16} />
            {showManageFeeds ? 'Hide' : 'Manage'} Feeds
          </button>
        </div>
        <p className="text-sm text-muted-foreground">updates from the research network and your RSS feeds</p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2 w-fit">
        <button
          type="button"
          onClick={() => setActiveView('actions')}
          className={`text-sm transition-colors ${activeView === 'actions'
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          User actions ({sortedSignals.length})
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={activeView === 'rss'}
          aria-label="Toggle between user actions and RSS entries"
          onClick={() => setActiveView(prev => (prev === 'actions' ? 'rss' : 'actions'))}
          className="relative h-7 w-14 rounded-full border border-border bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span
            className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-card shadow-sm transition-transform ${activeView === 'rss' ? 'translate-x-7' : 'translate-x-0.5'
              }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveView('rss')}
          className={`text-sm transition-colors ${activeView === 'rss'
            ? 'text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          RSS entries ({sortedRssEntries.length})
        </button>
      </div>

      {showManageFeeds && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your RSS Feeds</h2>
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={16} />
              Add Feed
            </button>
          </div>

          {feedList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No RSS feeds added yet.</p>
          ) : (
            <div className="space-y-2">
              {feedList.map(feed => (
                <div key={feed.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium text-sm truncate">{feed.title || feed.domain}</p>
                    <p className="text-xs text-muted-foreground">{feed.domain}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFeed(feed.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {activeView === 'actions' ? (
          sortedSignals.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 border border-dashed rounded-2xl">
              <p className="text-muted-foreground">No user actions yet. Connect with others to see activity.</p>
            </div>
          ) : (
            sortedSignals.map((signal, idx) => (
              <React.Fragment key={signal.id}>
                <div className="flex gap-3">
                  <div className="mt-1">
                    {renderSignalIcon(signal.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}</span>
                    </div>
                    {renderSignalContent(signal)}
                  </div>
                </div>

                {isFree && idx === 3 && (
                  <div className="my-8">
                    <UpgradePrompt
                      reason="shared_collections_pro_only"
                    />
                  </div>
                )}
              </React.Fragment>
            ))
          )
        ) : sortedRssEntries.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 border border-dashed rounded-2xl">
            <p className="text-muted-foreground">No RSS entries yet. Add feeds to populate this tab.</p>
          </div>
        ) : (
          <>
            {sortedRssEntries.map((entry) => (
              <RSSEntryCard key={`rss-${entry.id}`} entry={entry} />
            ))}
            {rssHasMore && <div ref={loadMoreTriggerRef} className="h-1" aria-hidden="true" />}
            {isLoadingMoreRss && (
              <p className="text-sm text-muted-foreground text-center">Loading more RSS entries...</p>
            )}
            {rssLoadError && (
              <p className="text-sm text-destructive text-center">{rssLoadError}</p>
            )}
          </>
        )}
      </div>

      {upgradePromptShown && (
        <UpgradePrompt
          reason="entry_limit_reached"
          onClose={() => setUpgradePromptShown(false)}
        />
      )}
      <AddFeedDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onFeedAdded={handleAddFeed}
      />
    </div>
  );
}
