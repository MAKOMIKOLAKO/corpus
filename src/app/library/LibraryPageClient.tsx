'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plan } from '@prisma/client';
import { isPro } from '@/lib/plans';
import LibraryBatchClient from '@/components/LibraryBatchClient';
import HomePageClient from '@/components/HomePageClient';
import EntryCard from '@/components/EntryCard';
import { Suspense } from 'react';

// Loading component for entries
function EntriesLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="glass-card rounded-xl p-6 animate-pulse">
          <div className="h-4 bg-[var(--muted)] rounded mb-3 w-3/4"></div>
          <div className="h-3 bg-[var(--muted)] rounded mb-2 w-full"></div>
          <div className="h-3 bg-[var(--muted)] rounded mb-4 w-2/3"></div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 bg-[var(--muted)] rounded-full w-16"></div>
            <div className="h-6 bg-[var(--muted)] rounded-full w-20"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-5 bg-[var(--muted)] rounded w-12"></div>
            <div className="h-5 bg-[var(--muted)] rounded w-16"></div>
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
  entries: any[];
}

export default function LibraryPageClient({
  user,
  search,
  readingStatus,
  year,
  topic,
  sortBy,
  entries
}: LibraryPageClientProps) {
  return (
    <LibraryBatchClient user={user}>
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
              <div className="text-sm text-muted-foreground">
                {entries.length === 0
                  ? 'no entries found'
                  : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
                }
              </div>
              {(search || readingStatus || year || sortBy !== 'newest') && (
                <Link
                  href="/library"
                  className="text-xs text-primary hover:underline underline-offset-2"
                >
                  clear all filters
                </Link>
              )}
            </div>

            {/* Entry Grid */}
            <Suspense fallback={<EntriesLoading />}>
              {entries.length === 0 ? (
                <div className="text-center py-24 rounded-xl bg-muted/30 border border-border/50">
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-foreground">no entries found</h3>
                      <p className="text-sm text-muted-foreground">
                        {search || readingStatus || year
                          ? 'try adjusting your search or filters'
                          : 'add your first entry to get started'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-visible">
                  {entries.map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      selectionMode={{
                        enabled: isSelectionMode,
                        isSelected: selectedIds.includes(entry.id),
                        onToggle: toggleSelection
                      }}
                    />
                  ))}
                </div>
              )}
            </Suspense>
          </div>
        </>
      )}
    </LibraryBatchClient>
  );
}
