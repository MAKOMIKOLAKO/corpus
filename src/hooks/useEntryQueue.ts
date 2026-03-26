import { useState, useCallback, useRef, useEffect } from 'react';
import { createEntryWithMetadata } from '@/lib/entryCreation';

export type QueueItemStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface QueueItem {
  id: string;
  url: string;
  metadata: {
    title: string;
    authors: string[];
    year?: number;
    publishDate?: string;
    contentType: string;
    url: string;
    doi: string;
    source: string;
    abstract: string;
  };
  status: QueueItemStatus;
  error?: string;
  entryId?: string;
  timestamp: number;
}

interface UseEntryQueueOptions {
  apiKey: string;
  onSuccess?: (item: QueueItem, entryId: string) => void;
  onError?: (item: QueueItem, error: string) => void;
  onQueueComplete?: () => void;
}

export function useEntryQueue({ apiKey, onSuccess, onError, onQueueComplete }: UseEntryQueueOptions) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  /**
   * Add a new entry to the queue
   */
  const addToQueue = useCallback((url: string, metadata: QueueItem['metadata']) => {
    const newItem: QueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      metadata,
      status: 'pending',
      timestamp: Date.now(),
    };

    setQueue(prev => [...prev, newItem]);
    return newItem.id;
  }, []);

  /**
   * Remove an item from the queue (for cancellation)
   */
  const removeFromQueue = useCallback((itemId: string) => {
    setQueue(prev => {
      const item = prev.find(i => i.id === itemId);
      // Only allow removal of pending items
      if (item && item.status === 'pending') {
        return prev.filter(i => i.id !== itemId);
      }
      return prev;
    });
  }, []);

  /**
   * Clear all completed/failed items from the queue
   */
  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(item => 
      item.status === 'pending' || item.status === 'processing'
    ));
  }, []);

  /**
   * Clear all items from the queue
   */
  const clearAll = useCallback(() => {
    setQueue([]);
    setIsProcessing(false);
    processingRef.current = false;
  }, []);

  /**
   * Retry a failed item
   */
  const retryItem = useCallback((itemId: string) => {
    setQueue(prev => prev.map(item => 
      item.id === itemId && item.status === 'failed'
        ? { ...item, status: 'pending' as QueueItemStatus, error: undefined }
        : item
    ));
  }, []);

  /**
   * Process the next item in the queue
   */
  const processNextItem = useCallback(async () => {
    const currentQueue = queueRef.current;
    const nextItem = currentQueue.find(item => item.status === 'pending');

    if (!nextItem) {
      setIsProcessing(false);
      processingRef.current = false;
      
      // Check if queue is complete (no pending or processing items)
      const hasActiveItems = currentQueue.some(
        item => item.status === 'pending' || item.status === 'processing'
      );
      if (!hasActiveItems && currentQueue.length > 0 && onQueueComplete) {
        onQueueComplete();
      }
      return;
    }

    // Mark as processing
    setQueue(prev => prev.map(item =>
      item.id === nextItem.id
        ? { ...item, status: 'processing' as QueueItemStatus }
        : item
    ));

    try {
      // Create the entry
      const result = await createEntryWithMetadata(
        nextItem.url,
        nextItem.metadata,
        apiKey
      );

      if (result.success && result.entry?.id) {
        // Success
        setQueue(prev => prev.map(item =>
          item.id === nextItem.id
            ? { ...item, status: 'success' as QueueItemStatus, entryId: result.entry.id }
            : item
        ));
        
        if (onSuccess) {
          onSuccess(nextItem, result.entry.id);
        }
      } else {
        // Failed
        const errorMessage = result.error || 'Failed to create entry';
        setQueue(prev => prev.map(item =>
          item.id === nextItem.id
            ? { ...item, status: 'failed' as QueueItemStatus, error: errorMessage }
            : item
        ));
        
        if (onError) {
          onError(nextItem, errorMessage);
        }
      }
    } catch (error: any) {
      // Exception during processing
      const errorMessage = error.message || 'An error occurred';
      setQueue(prev => prev.map(item =>
        item.id === nextItem.id
          ? { ...item, status: 'failed' as QueueItemStatus, error: errorMessage }
          : item
      ));
      
      if (onError) {
        onError(nextItem, errorMessage);
      }
    }

    // Process next item
    setTimeout(() => processNextItem(), 100);
  }, [apiKey, onSuccess, onError, onQueueComplete]);

  /**
   * Start processing the queue
   */
  const startProcessing = useCallback(() => {
    if (processingRef.current) return;
    
    processingRef.current = true;
    setIsProcessing(true);
    processNextItem();
  }, [processNextItem]);

  // Auto-start processing when items are added
  useEffect(() => {
    const hasPendingItems = queue.some(item => item.status === 'pending');
    if (hasPendingItems && !processingRef.current) {
      startProcessing();
    }
  }, [queue, startProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processingRef.current = false;
    };
  }, []);

  return {
    queue,
    isProcessing,
    addToQueue,
    removeFromQueue,
    clearCompleted,
    clearAll,
    retryItem,
    stats: {
      total: queue.length,
      pending: queue.filter(i => i.status === 'pending').length,
      processing: queue.filter(i => i.status === 'processing').length,
      success: queue.filter(i => i.status === 'success').length,
      failed: queue.filter(i => i.status === 'failed').length,
    }
  };
}
