import { CheckCircle2, XCircle, Loader2, Clock, X, RotateCcw, Trash2 } from 'lucide-react';
import { QueueItem } from '@/hooks/useEntryQueue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface QueuedEntriesDisplayProps {
  queue: QueueItem[];
  stats: {
    total: number;
    pending: number;
    processing: number;
    success: number;
    failed: number;
  };
  onRemove: (itemId: string) => void;
  onRetry: (itemId: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

export default function QueuedEntriesDisplay({
  queue,
  stats,
  onRemove,
  onRetry,
  onClearCompleted,
  onClearAll,
}: QueuedEntriesDisplayProps) {
  const router = useRouter();

  if (queue.length === 0) {
    return null;
  }

  const getStatusIcon = (status: QueueItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: QueueItem['status']) => {
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Added';
      case 'failed':
        return 'Failed';
    }
  };

  const getStatusColor = (status: QueueItem['status']) => {
    switch (status) {
      case 'pending':
        return 'text-muted-foreground';
      case 'processing':
        return 'text-blue-500';
      case 'success':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Entry Queue</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {stats.pending > 0 && (
                <span className="px-2 py-0.5 bg-muted rounded-full">
                  {stats.pending} pending
                </span>
              )}
              {stats.processing > 0 && (
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full">
                  {stats.processing} processing
                </span>
              )}
              {stats.success > 0 && (
                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">
                  {stats.success} added
                </span>
              )}
              {stats.failed > 0 && (
                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full">
                  {stats.failed} failed
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(stats.success > 0 || stats.failed > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCompleted}
                className="text-xs h-7"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear Completed
              </Button>
            )}
            {queue.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-xs h-7"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="mt-0.5">
                {getStatusIcon(item.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.metadata.title || 'Untitled Entry'}
                    </p>
                    {item.metadata.authors.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.metadata.authors.join(', ')}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${getStatusColor(item.status)}`}>
                    {getStatusText(item.status)}
                  </span>
                </div>
                
                {item.error && (
                  <p className="text-xs text-red-500 mt-1">
                    {item.error}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {item.status === 'success' && item.entryId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/entries/${item.entryId}`)}
                    className="h-7 px-2 text-xs"
                  >
                    View
                  </Button>
                )}
                
                {item.status === 'failed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRetry(item.id)}
                    className="h-7 px-2"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                )}
                
                {item.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                    className="h-7 px-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
