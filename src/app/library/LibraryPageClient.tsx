'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plan } from '@prisma/client';
import { isPro } from '@/lib/plans';
import LibraryBatchClient from '@/components/LibraryBatchClient';
import HomePageClient from '@/components/HomePageClient';
import EntryCard from '@/components/EntryCard';
import { Suspense } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { FlatEntry } from '@/types/entry';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

// Loading component for entries
function EntriesLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
          <div className="h-4 bg-muted rounded mb-3 w-3/4"></div>
          <div className="h-3 bg-muted rounded mb-2 w-full"></div>
          <div className="h-3 bg-muted rounded mb-4 w-2/3"></div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-muted rounded-full w-16"></div>
            <div className="h-6 bg-muted rounded-full w-20"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-5 bg-muted rounded w-12"></div>
            <div className="h-5 bg-muted rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface LibraryPageClientProps {
  user: {
    plan: Plan;
    entriesCount: number;
    personalCollectionsCount: number;
  };
  search?: string;
  readingStatus?: string;
  year?: string;
  topic?: string;
  sortBy?: string;
}

export default function LibraryPageClient({
  user,
  search,
  readingStatus,
  year,
  topic,
  sortBy
}: LibraryPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = {
    q: search || searchParams?.get('q') || undefined,
    readingStatus: readingStatus || searchParams?.get('readingStatus') || undefined,
    year: year ? parseInt(year) : searchParams?.get('year') ? parseInt(searchParams.get('year')!) : undefined,
    collectionId: searchParams?.get('collectionId') || undefined,
    sortBy: sortBy === 'newest' ? 'createdAt' :
      sortBy === 'oldest' ? 'createdAt' :
        sortBy === 'title' ? 'title' :
          sortBy === 'title-desc' ? 'title' :
            sortBy === 'most-saved' ? 'saveCount' :
              'createdAt',
    sortOrder: sortBy === 'oldest' || sortBy === 'title-desc' ? 'asc' : 'desc'
  };

  const { entries, total, loading, error, hasMore, loadMore, removeEntry, removeEntries, updateEntry, highlightDuplicate } = useLibrary(filters);

  const handleAddEntry = async (newEntry: FlatEntry) => {
    // Handle duplicate response
    if (newEntry.isDuplicate) {
      toast.error('This entry is already in your library');
      highlightDuplicate(newEntry.globalEntryId);
    } else {
      toast.success('Entry added to library');
      router.refresh();
    }
  };
  return (
    <LibraryBatchClient
      user={user}
      allEntryIds={entries.map((entry) => entry.id)}
      onBatchDelete={removeEntries}
    >
      {({ isSelectionMode, selectedIds, toggleSelection }) => (
        <>
          {/* Search and Filters */}
          <HomePageClient
            initialSearch={search || ''}
            initialReadingStatus={readingStatus || ''}
            initialYear={year || ''}
            initialTopic={topic || ''}
            initialSortBy={sortBy || 'newest'}
          />

          {/* Results Section */}
          <div className="space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="body-small text-content-secondary">
                {loading ? 'loading...' : (
                  total === 0
                    ? 'no entries found'
                    : `${total} ${total === 1 ? 'entry' : 'entries'}`
                )}
              </div>
              {(search || readingStatus || year || sortBy !== 'newest') && (
                <Link
                  href="/library"
                  className="text-xs text-terracotta hover:text-terracotta-hover underline-offset-2 hover:underline"
                >
                  clear all filters
                </Link>
              )}
            </div>

            {/* Entry Grid */}
            <Suspense fallback={<EntriesLoading />}>
              {!loading && entries.length === 0 ? (
                <div className="text-center py-24 rounded-xl bg-surface-raised border border-border/50">
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-warm-sand flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-content-tertiary">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-serif text-xl font-medium text-content-primary">no entries found</h3>
                      <p className="body-standard text-content-secondary">
                        {search || readingStatus || year
                          ? 'try adjusting your search or filters'
                          : 'add your first entry to get started'
                        }
                      </p>
                      {!(search || readingStatus || year) && (
                        <div className="flex gap-3 justify-center mt-4">
                          <Link
                            href="/research"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity button-terracotta"
                          >
                            Discover papers
                          </Link>
                          <Link
                            href="/feeds/discover"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-raised text-content-primary text-sm font-medium hover:bg-surface-sunken transition-colors"
                          >
                            Browse feeds
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {entries.map((entry) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        scrollPositionKey="library"
                        fromPath="/library"
                        onDelete={removeEntry}
                        selectionMode={{
                          enabled: isSelectionMode,
                          isSelected: selectedIds.includes(entry.id),
                          onToggle: toggleSelection,
                        }}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <Button
                        variant="warm-sand"
                        onClick={loadMore}
                        disabled={loading}
                        className="px-6"
                      >
                        {loading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Suspense>
          </div>
        </>
      )}
    </LibraryBatchClient>
  );
}
