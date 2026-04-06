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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { UpgradePrompt } from '@/components/UpgradePrompt';

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

interface FeedClientProps {
  signals: FeedSignal[];
  userPlan: Plan;
  rssEntries?: RSSEntry[];
}

export default function FeedClient({ signals, userPlan, rssEntries = [] }: FeedClientProps) {
  const isFree = userPlan === 'FREE';
  const [upgradePromptShown, setUpgradePromptShown] = React.useState(false);

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
              <span>Added {formatDistanceToNow(new Date(entry.addedAt), { addSuffix: true })}</span>
            </div>

            <div className="flex items-center gap-1">
              <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
                <Bookmark size={14} />
              </button>
              <Link
                href={`/entries/${entry.id}`}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
              >
                <Eye size={14} />
              </Link>
            </div>
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
        <h1 className="text-2xl font-semibold tracking-tight">feed</h1>
        <p className="text-sm text-muted-foreground">updates from the research network and your RSS feeds</p>
      </div>

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
    </div>
  );
}
