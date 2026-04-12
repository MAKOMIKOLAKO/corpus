'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  CheckSquare,
  Square,
  MoreHorizontal,
  FolderPlus,
  CircleDot,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plan } from '@prisma/client';
import { isPro } from '@/lib/plans';
import { UpgradePrompt } from './UpgradePrompt';
import BibliographyGenerateDialog from './BibliographyGenerateDialog';

interface LibraryBatchClientProps {
  user: {
    plan: Plan;
    entriesCount: number;
    personalCollectionsCount: number;
  };
  allEntryIds?: string[];
  onBatchDelete?: (deletedIds: string[]) => void;
  children: (props: {
    isSelectionMode: boolean;
    selectedIds: string[];
    toggleSelection: (id: string) => void;
  }) => React.ReactNode;
}

export default function LibraryBatchClient({ user, allEntryIds = [], onBatchDelete, children }: LibraryBatchClientProps) {
  const router = useRouter();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'batch_actions_pro_only' | 'bibliography_pro_only'>('batch_actions_pro_only');
  const [showBibliographyDialog, setShowBibliographyDialog] = useState(false);
  const [visibleEntriesCount, setVisibleEntriesCount] = useState(Math.max(user.entriesCount, 0));

  const maxEntries = user.plan === 'FREE' ? 50 : Infinity;
  const usagePercentage = user.plan === 'FREE'
    ? Math.min(Math.max((visibleEntriesCount / maxEntries) * 100, 0), 100)
    : 0;
  const isNearLimit = user.plan === 'FREE' && visibleEntriesCount >= 40;

  useEffect(() => {
    setVisibleEntriesCount(Math.max(user.entriesCount, 0));
  }, [user.entriesCount]);

  const toggleSelectionMode = () => {
    if (!isPro(user.plan)) {
      setUpgradeReason('batch_actions_pro_only');
      setShowUpgradeModal(true);
      return;
    }
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds([]);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    if (allEntryIds.length === 0) return;
    setSelectedIds(allEntryIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  useEffect(() => {
    setSelectedIds(prev => {
      const next = prev.filter(id => allEntryIds.includes(id));
      return next.length === prev.length ? prev : next;
    });
  }, [allEntryIds]);

  const allVisibleSelected = allEntryIds.length > 0 && allEntryIds.every(id => selectedIds.includes(id));
  const hasValidBibliographySelection = selectedIds.length >= 2 && selectedIds.length <= 200;

  const openBibliographyDialog = () => {
    if (!isPro(user.plan)) {
      setUpgradeReason('bibliography_pro_only');
      setShowUpgradeModal(true);
      return;
    }
    if (!hasValidBibliographySelection) {
      return;
    }
    setShowBibliographyDialog(true);
  };

  const handleBatchAction = async (action: string, value?: any) => {
    if (selectedIds.length === 0) return;

    const idsToProcess = [...selectedIds];
    setIsProcessing(true);
    try {
      const res = await fetch('/api/entries/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEntryIds: selectedIds, action, payload: { value } }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));

        if (action === 'DELETE' || action === 'delete') {
          const deletedIds = Array.isArray(data.deletedIds) && data.deletedIds.length > 0
            ? data.deletedIds
            : idsToProcess;
          const affected = deletedIds.length;
          setVisibleEntriesCount(prev => Math.max(prev - affected, 0));
          onBatchDelete?.(deletedIds);
        }

        setIsSelectionMode(false);
        setSelectedIds([]);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Batch action failed');
      }
    } catch (error) {
      console.error('Batch action error:', error);
      alert('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6" id="library-bibliography-actions">
      {/* Usage Indicator & Batch Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-muted/20 border border-border/50 rounded-xl p-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <CircleDot size={14} className={isNearLimit ? "text-orange-500" : "text-primary"} />
              Library Usage
            </span>
            <span className={isNearLimit ? "text-orange-600 font-bold" : "text-muted-foreground"}>
              {visibleEntriesCount} / {user.plan === 'FREE' ? '50' : '∞'} entries
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isNearLimit ? 'bg-orange-500' : 'bg-primary'}`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          {isNearLimit && (
            <p className="text-[10px] text-orange-600 flex items-center gap-1">
              <AlertCircle size={10} />
              Approaching limit. Upgrade for unlimited storage.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <>
              <span className="text-xs font-medium mr-2">
                {selectedIds.length} entries selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllVisible}
                disabled={allEntryIds.length === 0 || allVisibleSelected || isProcessing}
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={selectedIds.length === 0 || isProcessing}
              >
                Clear all
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('UPDATE_STATUS', 'COMPLETED')}
                disabled={selectedIds.length === 0 || isProcessing}
              >
                Mark Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openBibliographyDialog}
                disabled={!hasValidBibliographySelection || isProcessing}
                title={selectedIds.length < 2 ? 'Select at least 2 entries' : undefined}
              >
                Generate Bibliography
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.length} entries?`)) {
                    handleBatchAction('DELETE');
                  }
                }}
                disabled={selectedIds.length === 0 || isProcessing}
                className="gap-1.5"
              >
                <Trash2 size={14} />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSelectionMode(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectionMode}
                className="gap-2"
              >
                {isPro(user.plan) ? <CheckSquare size={16} /> : <CircleDot size={16} className="text-amber-500" />}
                Batch Select
              </Button>
            </>
          )}
        </div>
      </div>

      {showUpgradeModal && (
        <div className="mb-4">
          <UpgradePrompt
            reason={upgradeReason}
            onClose={() => setShowUpgradeModal(false)}
          />
        </div>
      )}

      <BibliographyGenerateDialog
        isOpen={showBibliographyDialog}
        onClose={() => setShowBibliographyDialog(false)}
        userEntryIds={selectedIds}
        onProRequired={() => {
          setUpgradeReason('bibliography_pro_only');
          setShowUpgradeModal(true);
        }}
      />

      {children({ isSelectionMode, selectedIds, toggleSelection })}
    </div>
  );
}
