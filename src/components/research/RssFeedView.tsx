// HIDDEN — feature disabled, do not import
'use client';

import React from 'react';
import { Rss, Plus, Settings, ExternalLink, Bookmark, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { AddFeedDialog } from '@/app/feed/AddFeedDialog';

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
  subscriptionId?: string;
  feedUrl: string;
  title: string | null;
  domain: string;
  lastFetchedAt: Date | null;
  addedAt: Date;
  isDefault?: boolean;
  defaultFeed?: {
    category?: string;
    description?: string | null;
  } | null;
}

interface RssFeedViewProps {
  userId: string;
}

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

export function RssFeedView({ userId }: RssFeedViewProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [showManageFeeds, setShowManageFeeds] = React.useState(false);
  const [feedList, setFeedList] = React.useState<UserFeed[]>([]);
  const [rssFeedEntries, setRssFeedEntries] = React.useState<RSSEntry[]>([]);
  const [rssPage, setRssPage] = React.useState(1);
  const [rssHasMore, setRssHasMore] = React.useState(false);
  const [isLoadingMoreRss, setIsLoadingMoreRss] = React.useState(false);
  const [rssLoadError, setRssLoadError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [highlightedFeedId, setHighlightedFeedId] = React.useState<string | null>(null);
  const loadMoreTriggerRef = React.useRef<HTMLDivElement | null>(null);

  // Load initial data
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load feeds
        const feedsRes = await fetch('/api/feeds');
        if (feedsRes.ok) {
          const feedsData = await feedsRes.json();
          setFeedList(feedsData.feeds || []);
        }

        // Load RSS entries
        const entriesRes = await fetch('/api/feed?filter=rss&page=1&limit=20');
        if (entriesRes.ok) {
          const entriesData = await entriesRes.json();
          setRssFeedEntries(entriesData.entries || []);
          setRssHasMore(entriesData.hasMore || false);
        }
      } catch (error) {
        console.error('Failed to load RSS data:', error);
        setRssLoadError('Failed to load RSS data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const sortedRssEntries = React.useMemo(
    () => [...rssFeedEntries].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()),
    [rssFeedEntries]
  );

  const loadMoreRssEntries = React.useCallback(async () => {
    if (isLoadingMoreRss || !rssHasMore) {
      return;
    }

    const nextPage = rssPage + 1;
    setIsLoadingMoreRss(true);

    try {
      const response = await fetch(`/api/feed?filter=rss&page=${nextPage}&limit=20`);
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
  }, [isLoadingMoreRss, rssHasMore, rssPage]);

  React.useEffect(() => {
    if (!rssHasMore) {
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
  }, [rssHasMore, loadMoreRssEntries]);

  const handleAddFeed = React.useCallback((newFeed: {
    id: string;
    feedUrl: string;
    title: string | null;
    domain: string;
    isDefault?: boolean;
    defaultFeed?: {
      category?: string;
    } | null;
  }) => {
    setFeedList(prev => [{ ...newFeed, lastFetchedAt: null, addedAt: new Date() } as UserFeed, ...prev]);
    setHighlightedFeedId(newFeed.id);
    setTimeout(() => setHighlightedFeedId(null), 3000);
    setIsAddDialogOpen(false);
    toast.success('Feed added successfully');
  }, []);

  const handleExistingSubscription = React.useCallback((existingFeedId?: string) => {
    if (!existingFeedId) {
      return;
    }

    setHighlightedFeedId(existingFeedId);
    setTimeout(() => setHighlightedFeedId(null), 3000);
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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-content-secondary">Loading RSS feeds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/feeds/discover"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Discover Feeds
          </Link>
        </div>
        <button
          onClick={() => setShowManageFeeds(!showManageFeeds)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings size={16} />
          {showManageFeeds ? 'Hide' : 'Manage'} Feeds
        </button>
      </div>

      {/* Manage Feeds Panel */}
      {showManageFeeds && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4 mb-6">
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
                <div
                  key={feed.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${highlightedFeedId === feed.id
                    ? 'border-primary bg-primary/10'
                    : 'border-transparent bg-muted/30'
                    }`}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium text-sm truncate">{feed.title || feed.domain}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{feed.domain}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${feed.isDefault
                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-900/20'
                        : 'border-border text-muted-foreground bg-background'
                        }`}>
                        {feed.isDefault ? 'Curated' : 'Custom'}
                      </span>
                      {feed.isDefault && feed.defaultFeed?.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground bg-background">
                          {feed.defaultFeed.category}
                        </span>
                      )}
                    </div>
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

      {/* RSS Entries */}
      {sortedRssEntries.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 border border-dashed rounded-2xl">
          <p className="text-muted-foreground">No RSS entries yet. Add feeds to populate this view.</p>
        </div>
      ) : (
        <div className="space-y-4">
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
        </div>
      )}

      <AddFeedDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onFeedAdded={handleAddFeed}
        onExistingSubscription={handleExistingSubscription}
      />
    </div>
  );
}
