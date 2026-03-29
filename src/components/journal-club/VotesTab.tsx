'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, Trophy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface VoteData {
  entryId: string;
  voteCount: number;
  userHasVoted: boolean;
  entry: {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
  };
}

interface VotesTabProps {
  collectionId: string;
  isJournalClub: boolean;
  canParticipate: boolean;
  votingEnabled?: boolean;
}

export default function VotesTab({ collectionId, isJournalClub, canParticipate, votingEnabled = true }: VotesTabProps) {
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);

  useEffect(() => {
    if (isJournalClub) {
      fetchVotes();
    }
  }, [isJournalClub, collectionId]);

  const fetchVotes = async () => {
    try {
      const response = await fetch(`/api/journal-club/${collectionId}/votes`);
      if (!response.ok) throw new Error('Failed to fetch votes');

      const data = await response.json();
      setVotes(data || []);
    } catch (error) {
      console.error('Error fetching votes:', error);
      toast.error('Failed to load votes');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (entryId: string) => {
    if (!canParticipate) {
      toast.error('You do not have permission to vote');
      return;
    }

    setVoting(entryId);
    const previousVotes = [...votes];
    const voteItem = previousVotes.find(v => v.entryId === entryId);
    const wasVoted = voteItem?.userHasVoted || false;
    const previousVoteCount = voteItem?.voteCount || 0;

    // Optimistic update
    setVotes(prev => prev.map(v =>
      v.entryId === entryId
        ? { ...v, userHasVoted: !wasVoted, voteCount: wasVoted ? v.voteCount - 1 : v.voteCount + 1 }
        : v
    ));

    try {
      const response = await fetch(`/api/journal-club/${collectionId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId })
      });

      if (!response.ok) {
        // Revert optimistic update
        setVotes(previousVotes);
        if (response.status === 403) {
          toast.error('You do not have permission to vote');
        } else {
          toast.error('Failed to vote');
        }
        return;
      }

      toast.success(wasVoted ? 'Vote removed' : 'Vote added');
    } catch (error) {
      // Revert optimistic update
      setVotes(previousVotes);
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    } finally {
      setVoting(null);
    }
  };

  // Find top voted entry (2+ votes)
  const topVotedEntry = votes.find((item: VoteData) => item.voteCount >= 2);

  if (!isJournalClub) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">This collection is not a journal club.</p>
      </div>
    );
  }

  if (!votingEnabled) {
    return (
      <div className="text-center py-12">
        <ThumbsUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Voting is disabled</h3>
        <p className="text-muted-foreground">
          The admin has disabled voting for this journal club. Contact an admin to enable voting.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="h-8 w-32 bg-muted rounded-md animate-pulse mb-2"></div>
        <div className="h-4 w-64 bg-muted rounded-md animate-pulse mb-6"></div>

        {/* Content skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-3/4 bg-muted rounded-md animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-muted rounded-md animate-pulse"></div>
                  <div className="flex items-center gap-4">
                    <div className="h-4 w-16 bg-muted rounded-md animate-pulse"></div>
                    <div className="h-8 w-24 bg-muted rounded-md animate-pulse"></div>
                  </div>
                </div>
                <div className="h-8 w-16 bg-muted rounded-md animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div className="text-center py-12">
        <ThumbsUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">All papers scheduled</h3>
        <p className="text-muted-foreground">
          All papers in this collection are scheduled. Add more papers to vote on future discussions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Vote for the next paper</h2>
        <p className="text-muted-foreground">
          Vote for papers you'd like to discuss. Papers already scheduled are not shown here.
        </p>
      </div>

      {/* Top Voted Entry */}
      {topVotedEntry && (
        <Card className="border-primary">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-primary" />
              <Badge variant="default">Top voted</Badge>
            </div>
            <h3 className="font-semibold mb-1">{topVotedEntry.entry.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {topVotedEntry.entry.authors.slice(0, 3).join(', ')}
              {topVotedEntry.entry.authors.length > 3 && ' et al.'}
              {topVotedEntry.entry.year && ` (${topVotedEntry.entry.year})`}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">{topVotedEntry.voteCount} votes</span>
              </div>
              <Button
                variant={topVotedEntry.userHasVoted ? "default" : "outline"}
                size="sm"
                onClick={() => handleVote(topVotedEntry.entryId)}
                disabled={voting === topVotedEntry.entryId || !canParticipate}
              >
                {topVotedEntry.userHasVoted ? (
                  <>
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Voted ✓
                  </>
                ) : (
                  <>
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Vote
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Entries */}
      <div className="space-y-4">
        {votes.map((item: VoteData) => (
          <Card key={item.entryId} className={
            item === topVotedEntry ? 'border-primary' : ''
          }>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{item.entry.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {item.entry.authors.slice(0, 3).join(', ')}
                    {item.entry.authors.length > 3 && ' et al.'}
                    {item.entry.year && ` (${item.entry.year})`}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.voteCount} votes</span>
                    </div>
                    <a
                      href={`/entries/${item.entryId}`}
                      target="_blank"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Paper
                    </a>
                  </div>
                </div>
                <Button
                  variant={item.userHasVoted ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVote(item.entryId)}
                  disabled={voting === item.entryId || !canParticipate}
                >
                  {item.userHasVoted ? (
                    <>
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Voted ✓
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Vote
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!canParticipate && (
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-muted-foreground">
              You must be a member of this collection to vote on papers.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
