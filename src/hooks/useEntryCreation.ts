/**
 * Hook for managing queue-based entry creation
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { InputMode, QueueSubmission } from '@/lib/entryQueue';
import { Entry } from '@prisma/client';

interface UseEntryCreationOptions {
  onEntryCreated?: (entry: Entry) => void;
  onError?: (error: string) => void;
}

export function useEntryCreation({ onEntryCreated, onError }: UseEntryCreationOptions = {}) {
  const { data: session } = useSession();
  const [queue, setQueue] = useState<QueueSubmission[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const reportedErrors = useRef<Set<string>>(new Set());

  // Submit a new entry
  const submitEntry = useCallback(async (mode: InputMode, input: string) => {
    if (!session?.user) {
      onError?.('You must be logged in to create entries');
      return;
    }

    // Clear previously reported errors for new submissions
    reportedErrors.current.clear();

    try {
      const response = await fetch('/api/entry/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode, input }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.existingEntry) {
          onError?.('This entry already exists in your library');
        } else {
          onError?.(data.error || 'Failed to submit entry');
        }
        return;
      }

      // Refresh queue
      await fetchQueue();

      // Start polling if not already
      if (!isPolling) {
        startPolling();
      }

    } catch (error) {
      onError?.('Network error. Please try again.');
    }
  }, [session, onError, isPolling]);

  // Fetch queue status
  const fetchQueue = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/entry/create');
      if (response.ok) {
        const data = await response.json();
        setQueue(data.queue || []);

        // Check for completed entries
        const completed = data.queue?.filter((s: QueueSubmission) =>
          s.status === 'completed' && s.result
        );

        if (completed?.length > 0) {
          completed.forEach((submission: QueueSubmission) => {
            onEntryCreated?.(submission.result);
          });
        }

        // Check for failed entries
        const failed = data.queue?.filter((s: QueueSubmission) =>
          s.status === 'failed'
        );

        if (failed?.length > 0) {
          failed.forEach((submission: QueueSubmission) => {
            const errorKey = `${submission.id}-${submission.error}`;
            if (!reportedErrors.current.has(errorKey)) {
              reportedErrors.current.add(errorKey);
              onError?.(`Failed to process: ${submission.error}`);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  }, [session, onEntryCreated, onError]);

  // Start polling for updates
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setIsPolling(true);
    pollingIntervalRef.current = setInterval(fetchQueue, 2000);
  }, [fetchQueue]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = undefined;
    }
    setIsPolling(false);
  }, []);

  // Clear completed entries
  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(item =>
      item.status === 'pending' || item.status === 'processing'
    ));
  }, []);

  // Retry failed entry
  const retryEntry = useCallback(async (submissionId: string) => {
    // This would require an additional API endpoint
    // For now, just re-fetch the queue
    await fetchQueue();
  }, [fetchQueue]);

  // Auto-start polling when there are pending items
  useEffect(() => {
    const hasPendingOrProcessing = queue.some(item =>
      item.status === 'pending' || item.status === 'processing'
    );

    if (hasPendingOrProcessing && !isPolling) {
      startPolling();
    } else if (!hasPendingOrProcessing && isPolling) {
      stopPolling();
    }
  }, [queue, isPolling, startPolling, stopPolling]);

  // Initial fetch
  useEffect(() => {
    if (session?.user) {
      fetchQueue();
    }
  }, [session, fetchQueue]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const stats = {
    total: queue.length,
    pending: queue.filter(i => i.status === 'pending').length,
    processing: queue.filter(i => i.status === 'processing').length,
    completed: queue.filter(i => i.status === 'completed').length,
    failed: queue.filter(i => i.status === 'failed').length,
  };

  return {
    queue,
    stats,
    submitEntry,
    clearCompleted,
    retryEntry,
    isPolling,
  };
}
