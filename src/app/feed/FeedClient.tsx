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
  Eye,
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
}

export default function FeedClient({ signals, userPlan, rssEntries = [], userFeeds = [] }: FeedClientProps) {
  const isFree = userPlan === 'FREE';
  const [upgradePromptShown, setUpgradePromptShown] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [feedList, setFeedList] = React.useState(userFeeds);
  const [showManageFeeds, setShowManageFeeds] = React.useState(false);

  // Combine and sort all items by date
  const allItems = [
    ...rssEntries.map(entry => ({
      type: 'RSS_ENTRY' as const,
      createdAt: new Date(entry.addedAt),
      data: entry
    })),
    ...signals.map(signal => ({
      type: 'SIGNAL' as const,
      createdAt: new Date(signal.createdAt),
      data: signal
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const handleAddFeed = (newFeed: any) => {
    setFeedList(prev => [newFeed, ...prev]);
    setIsAddDialogOpen(false);
    toast.success('Feed added successfully');
  };

  const handleRemoveFeed = async (feedId: string) => {
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
  };

  const renderSignalIcon = (type: string) => {
    switch (type) {
      case 'ENTRY_CREATED': return <BookOpen size={18} className="text-blue-500" />;
      case 'ENTRY_ADDED_TO_COLLECTION': return <Folder size={18} className="text-green-500" />;
      case 'COLLECTION_CREATED': return <Folder size={18} className="text-green-500" />;
      case 'COLLECTION_MEMBER_JOINED': return <UserPlus size={18} className="text-purple-500" />;
      case 'ENTRY_SHARED': return <Share2 size={18} className="text-orange-500" />;
      default: return <Sparkles size={18} className="text-gray-400" />;
    }
  };

  const renderRSSEntry = (entry: RSSEntry) => {
    const [isAdding, setIsAdding] = React.useState(false);
    const [isAdded, setIsAdded] = React.useState(false);

    const handleAddToLibrary = async () => {
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
            source: entry.source,
            url: entry.url,
            readingStatus: 'UNREAD'
          })
        });

        const data = await response.json();

        if (data.isDuplicate) {
          toast.error('This entry is already in your library');
        } else {
          toast.success('Added to library');
          setIsAdded(true);
        }
      } catch (error) {
        toast.error('Failed to add to library');
      } finally {
        setIsAdding(false);
      }
    };

    return (
      <div className="group flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:shadow-sm transition-all">
        <div className="mt-1">
          <Rss size={18} className="text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
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
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-all touch-manipulation ${
                isAdded 
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' 
                  : 'bg-background border-border hover:bg-muted hover:text-foreground'
              }"
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
  };

  const renderSignalContent = (signal: FeedSignal) => {
    const userName = signal.user.name || signal.user.username || 'Someone';
    const timeAgo = formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true });

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
                  <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
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
                  <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
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
  };

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
        {allItems.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 border border-dashed rounded-2xl">
            <p className="text-muted-foreground">No updates yet. Connect with others or add RSS feeds to see activity!</p>
          </div>
        ) : (
          allItems.map((item, idx) => (
            <React.Fragment key={item.type === 'RSS_ENTRY' ? `rss-${item.data.id}` : item.data.id}>
              {/* RSS Entry */}
              {item.type === 'RSS_ENTRY' && renderRSSEntry(item.data)}

              {/* Signal */}
              {item.type === 'SIGNAL' && (
                <div className="flex gap-3">
                  <div className="mt-1">
                    {renderSignalIcon(item.data.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(item.data.createdAt, { addSuffix: true })}</span>
                    </div>
                    {renderSignalContent(item.data)}
                  </div>
                </div>
              )}

              {/* Contextual Pro Upsells for Free Users */}
              {isFree && idx === 3 && (
                <div className="my-8">
                  <UpgradePrompt
                    reason="shared_collections_pro_only"
                  />
                </div>
              )}
            </React.Fragment>
          ))
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
