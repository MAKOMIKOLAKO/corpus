'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Trash2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string | null;
  };
}

interface Entry {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
}

interface DiscussionTabProps {
  collectionId: string;
  isJournalClub: boolean;
  canParticipate: boolean;
  currentUserId: string;
}

export default function DiscussionTab({ collectionId, isJournalClub, canParticipate, currentUserId }: DiscussionTabProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (isJournalClub) {
      fetchEntries();
    }
  }, [isJournalClub, collectionId]);

  useEffect(() => {
    if (selectedEntryId) {
      fetchComments(selectedEntryId);
    }
  }, [selectedEntryId, collectionId]);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`/api/journal-club/${collectionId}/schedule`);
      if (!response.ok) throw new Error('Failed to fetch entries');

      const data = await response.json();
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (entryId: string) => {
    setCommentsLoading(true);
    try {
      const response = await fetch(`/api/journal-club/${collectionId}/comments/${entryId}`);
      if (!response.ok) throw new Error('Failed to fetch comments');

      const data = await response.json();
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!canParticipate) {
      toast.error('You do not have permission to comment');
      return;
    }

    setPosting(true);
    try {
      const response = await fetch('/api/journal-club/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          entryId: selectedEntryId,
          content: newComment.trim()
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('You do not have permission to comment');
        } else {
          toast.error('Failed to post comment');
        }
        return;
      }

      setNewComment('');
      fetchComments(selectedEntryId);
      toast.success('Comment posted successfully');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeleting(commentId);
    try {
      const response = await fetch(`/api/journal-club/comment/${commentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('You do not have permission to delete this comment');
        } else {
          toast.error('Failed to delete comment');
        }
        return;
      }

      fetchComments(selectedEntryId);
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setDeleting(null);
    }
  };

  const selectedEntry = entries.find(e => e.id === selectedEntryId);
  const characterCount = newComment.length;

  if (!isJournalClub) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">This collection is not a journal club.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="h-8 w-48 bg-muted rounded-md animate-pulse mb-2"></div>
        <div className="h-4 w-64 bg-muted rounded-md animate-pulse mb-6"></div>

        {/* Entry selector skeleton */}
        <div className="h-10 w-full bg-muted rounded-md animate-pulse"></div>

        {/* Content skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 bg-muted rounded-md animate-pulse"></div>
                    <div className="h-3 w-16 bg-muted rounded-md animate-pulse"></div>
                  </div>
                  <div className="h-4 w-3/4 bg-muted rounded-md animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No papers in this collection</h3>
        <p className="text-muted-foreground">Add papers to this collection to start discussions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entry selector */}
      <div className="flex items-center gap-4">
        {entries.length <= 5 ? (
          <div className="flex gap-2 flex-wrap">
            {entries.map((entry) => (
              <Button
                key={entry.id}
                variant={selectedEntryId === entry.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedEntryId(entry.id)}
              >
                {entry.title.length > 30 ? entry.title.slice(0, 30) + '...' : entry.title}
              </Button>
            ))}
          </div>
        ) : (
          <Select value={selectedEntryId} onValueChange={(value) => setSelectedEntryId(value || '')}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a paper to discuss" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">-- Select --</SelectItem>
              {entries.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Selected Entry Info */}
      {selectedEntry && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-1">{selectedEntry.title}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedEntry.authors.slice(0, 3).join(', ')}
              {selectedEntry.authors.length > 3 && ' et al.'}
              {selectedEntry.year && ` (${selectedEntry.year})`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comments Thread */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Discussion ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedEntryId ? (
            <div className="space-y-4">
              {commentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex gap-3">
                        <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-24 bg-muted rounded-md animate-pulse"></div>
                            <div className="h-3 w-16 bg-muted rounded-md animate-pulse"></div>
                          </div>
                          <div className="h-4 w-3/4 bg-muted rounded-md animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {comments.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No discussions yet</h3>
                        <p className="text-muted-foreground">Be the first to start a discussion about this paper.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <Card key={comment.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium">{comment.user.name || comment.user.username}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-sm">{comment.content}</p>
                              </div>
                              {comment.user.id === currentUserId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  disabled={deleting === comment.id}
                                >
                                  {deleting === comment.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a paper to start discussion</h3>
                <p className="text-muted-foreground">Choose a paper from the options above to view and participate in discussions.</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* New Comment Input */}
      {canParticipate && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Add a comment about this paper..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs ${characterCount > 2000 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {characterCount}/2000
                </span>
                <Button
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || characterCount > 2000 || posting}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {posting ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
