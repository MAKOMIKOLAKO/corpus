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
    contentType: string;
  } | null;
  collection?: {
    id: string;
    name: string;
  } | null;
  metadata?: any;
}

interface FeedClientProps {
  signals: FeedSignal[];
  userPlan: Plan;
}

export default function FeedClient({ signals, userPlan }: FeedClientProps) {
  const isFree = userPlan === 'FREE';
  const [upgradePromptShown, setUpgradePromptShown] = React.useState(false);

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
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">
                    {signal.entry.contentType.toLowerCase()}
                  </p>
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
              <span className="font-semibold text-foreground">{userName}</span> added a paper to shared collection{' '}
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
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">
                    {signal.entry.contentType.toLowerCase()}
                  </p>
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
        <p className="text-sm text-muted-foreground">updates from the research network</p>
      </div>

      <div className="space-y-6">
        {signals.length === 0 ? (
          <div className="text-center py-20 bg-muted/20 border border-dashed rounded-2xl">
            <p className="text-muted-foreground">No updates yet. Connect with others to see their activity!</p>
          </div>
        ) : (
          signals.map((signal, idx) => (
            <React.Fragment key={signal.id}>
              {/* Contextual Pro Upsells for Free Users */}
              {isFree && idx === 1 && (
                <div className="my-8">
                  <UpgradePrompt
                    reason="shared_collections_pro_only"
                  />
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                    {signal.user.image ? (
                      <img src={signal.user.image} alt={signal.user.name || ''} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {(signal.user.name || signal.user.username || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="w-0.5 grow bg-border/40 last:hidden" />
                </div>

                <div className="flex-1 pb-8 group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-muted transition-colors">
                      {renderSignalIcon(signal.type)}
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                      {formatDistanceToNow(new Date(signal.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="bg-card glass-card border-none p-0">
                    {renderSignalContent(signal)}
                  </div>
                </div>
              </div>

              {isFree && idx === 4 && (
                <div className="my-8">
                  <UpgradePrompt
                    reason="advanced_search_pro_only"
                  />
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}
