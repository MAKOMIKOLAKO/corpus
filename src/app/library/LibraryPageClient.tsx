'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { Plan } from '@prisma/client';
import { isPro } from '@/lib/plans';
import LibraryBatchClient from '@/components/LibraryBatchClient';
import EntryCard from '@/components/EntryCard';
import { Suspense } from 'react';
import { useLibrary } from '@/hooks/useLibrary';
import { FlatEntry } from '@/types/entry';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

const STATUS_TABS = [
    { label: 'All', value: '' },
    { label: 'Unread', value: 'UNREAD' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
];

const SORT_OPTIONS = [
    { label: 'Date Added', value: 'newest' },
    { label: 'Title', value: 'title' },
    { label: 'Year', value: 'oldest' },
];

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
  const [isPending, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(search || searchParams?.get('search') || '');

  const currentStatus = readingStatus || searchParams?.get('readingStatus') || '';
  const currentSort = sortBy || searchParams?.get('sortBy') || 'newest';

  const pushUrl = (overrides: { search?: string; readingStatus?: string; sortBy?: string }) => {
    const params = new URLSearchParams();
    const s = overrides.search !== undefined ? overrides.search : searchInput;
    const rs = overrides.readingStatus !== undefined ? overrides.readingStatus : currentStatus;
    const sb = overrides.sortBy !== undefined ? overrides.sortBy : currentSort;
    if (s) params.set('search', s);
    if (rs) params.set('readingStatus', rs);
    if (sb && sb !== 'newest') params.set('sortBy', sb);
    if (year) params.set('year', year);
    if (topic) params.set('topic', topic);
    startTransition(() => {
      router.push(`/library?${params.toString()}`);
    });
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => pushUrl({ search: searchInput }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

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
        <div style={{ background: '#f5f4ed', minHeight: '100%' }}>
          {/* Sticky filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '44px', borderBottom: '1px solid #f0eee6', background: '#f5f4ed', flexShrink: 0 }}>
            {/* Status tabs */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => pushUrl({ readingStatus: tab.value })}
                  style={{
                    padding: '4px 10px',
                    fontSize: '13px',
                    color: currentStatus === tab.value ? '#c96442' : '#5e5d59',
                    cursor: 'pointer',
                    borderBottom: currentStatus === tab.value ? '2px solid #c96442' : '2px solid transparent',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    background: 'none',
                    fontFamily: 'system-ui, sans-serif',
                    transition: 'color 100ms, border-color 100ms',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search + sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search entries…"
                style={{
                  height: '30px',
                  padding: '0 10px',
                  border: '1px solid #f0eee6',
                  borderRadius: '6px',
                  background: '#faf9f5',
                  fontSize: '13px',
                  fontFamily: 'Georgia, serif',
                  color: '#141413',
                  outline: 'none',
                  width: '160px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#c96442';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(201,100,66,0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#f0eee6';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <select
                value={currentSort}
                onChange={(e) => pushUrl({ sortBy: e.target.value })}
                style={{
                  height: '30px',
                  padding: '0 8px',
                  border: '1px solid #f0eee6',
                  borderRadius: '6px',
                  background: '#faf9f5',
                  fontSize: '12px',
                  fontFamily: 'system-ui, sans-serif',
                  color: '#5e5d59',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Entry count row */}
          <div style={{ padding: '6px 20px', fontSize: '12px', color: '#87867f', borderBottom: '1px solid #f0eee6', background: '#f5f4ed', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>
              {loading ? 'loading…' : total === 0 ? 'no entries found' : `${total} ${total === 1 ? 'entry' : 'entries'}`}
            </span>
            {(search || readingStatus || year || currentSort !== 'newest') && (
              <Link
                href="/library"
                style={{ fontSize: '12px', color: '#c96442', textDecoration: 'none' }}
              >
                clear filters
              </Link>
            )}
          </div>

          {/* Entry list */}
          <Suspense>
            {!loading && entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px', color: '#87867f' }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: '16px', marginBottom: '8px', color: '#141413' }}>
                  no entries found
                </div>
                <p style={{ fontSize: '13px' }}>
                  {search || readingStatus || year
                    ? 'try adjusting your search or filters'
                    : 'add your first entry to get started'
                  }
                </p>
              </div>
            ) : (
              <>
                <div>
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
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      style={{
                        padding: '6px 20px',
                        border: '1px solid #f0eee6',
                        borderRadius: '6px',
                        background: '#faf9f5',
                        fontSize: '13px',
                        color: '#5e5d59',
                        cursor: loading ? 'default' : 'pointer',
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    >
                      {loading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </Suspense>

          {/* FAB */}
          <Link
            href="/add"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#c96442',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(201,100,66,0.35)',
              zIndex: 50,
              textDecoration: 'none',
            }}
            title="Add entry"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <line x1="10" y1="4" x2="10" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="10" x2="16" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      )}
    </LibraryBatchClient>
  );
}
