'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatJournalClubDate, formatJournalClubTime } from '@/lib/journalClub';
import { toast } from 'sonner';

interface ScheduledEntry {
  id: string;
  entry: {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
  };
  presentationDate: string;
  presenterId: string;
  presenterName: string;
  presented: boolean;
}

interface UnscheduledEntry {
  id: string;
  entry: {
    id: string;
    title: string;
    authors: string[];
    year: number | null;
  };
}

interface CollectionMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    username: string;
  };
}

interface ScheduleTabProps {
  collectionId: string;
  isJournalClub: boolean;
  canManage: boolean;
  currentUserId: string;
}

export default function ScheduleTab({ collectionId, isJournalClub, canManage, currentUserId }: ScheduleTabProps) {
  const [scheduledEntries, setScheduledEntries] = useState<ScheduledEntry[]>([]);
  const [unscheduledEntries, setUnscheduledEntries] = useState<UnscheduledEntry[]>([]);
  const [members, setMembers] = useState<CollectionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [unassigning, setUnassigning] = useState<string | null>(null);
  const [presenting, setPresenting] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [selectedPresenterId, setSelectedPresenterId] = useState('');
  const [presentationDate, setPresentationDate] = useState('');
  const [showPastPresentations, setShowPastPresentations] = useState(false);

  useEffect(() => {
    if (isJournalClub) {
      fetchScheduleData();
    }
  }, [isJournalClub, collectionId]);

  const fetchScheduleData = async () => {
    try {
      const [scheduledRes, unscheduledRes, membersRes] = await Promise.all([
        fetch(`/api/journal-club/${collectionId}/meetings`),
        fetch(`/api/journal-club/${collectionId}/schedule`),
        fetch(`/api/collections/${collectionId}/members`)
      ]);

      if (!scheduledRes.ok || !unscheduledRes.ok || !membersRes.ok) {
        throw new Error('Failed to fetch schedule data');
      }

      const [scheduledData, unscheduledData, membersData] = await Promise.all([
        scheduledRes.json(),
        unscheduledRes.json(),
        membersRes.json()
      ]);

      setScheduledEntries(scheduledData || []);
      setUnscheduledEntries(unscheduledData || []);
      setMembers(membersData || []);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulePresentation = async () => {
    if (!selectedEntryId || !selectedPresenterId || !presentationDate) {
      toast.error('Please fill in all fields');
      return;
    }

    setScheduling(selectedEntryId);
    try {
      const response = await fetch('/api/journal-club/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          entryId: selectedEntryId,
          presenterId: selectedPresenterId,
          presentationDate: new Date(presentationDate).toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error === 'date_already_scheduled') {
          toast.error('Another paper is already scheduled for that date. Please choose a different date.');
        } else if (response.status === 403) {
          toast.error('You do not have permission to schedule presentations.');
        } else {
          toast.error('Failed to schedule presentation');
        }
        return;
      }

      toast.success('Presentation scheduled successfully');
      setShowScheduleModal(false);
      setSelectedEntryId('');
      setSelectedPresenterId('');
      setPresentationDate('');
      fetchScheduleData();
    } catch (error) {
      console.error('Error scheduling presentation:', error);
      toast.error('Failed to schedule presentation');
    } finally {
      setScheduling(null);
    }
  };

  const handleMarkAsPresented = async (entryId: string) => {
    setPresenting(entryId);
    try {
      const response = await fetch(`/api/journal-club/schedule/${entryId}/present`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId })
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('You do not have permission to mark presentations as complete.');
        } else {
          toast.error('Failed to mark as presented');
        }
        return;
      }

      toast.success('Presentation marked as complete');
      fetchScheduleData();
    } catch (error) {
      console.error('Error marking as presented:', error);
      toast.error('Failed to mark as presented');
    } finally {
      setPresenting(null);
    }
  };

  const upcomingPresentations = scheduledEntries.filter(entry => !entry.presented);
  const pastPresentations = scheduledEntries.filter(entry => entry.presented);

  if (!isJournalClub) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">This collection is not a journal club.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Upcoming Presentations</h2>
          <p className="text-muted-foreground">Schedule and manage journal club presentations</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowScheduleModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add a Paper
          </Button>
        )}
      </div>

      {/* Upcoming Presentations */}
      {upcomingPresentations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No papers scheduled yet</h3>
            <p className="text-muted-foreground mb-4">
              Add papers to this collection and schedule them for presentation.
            </p>
            {canManage && (
              <Button onClick={() => setShowScheduleModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule First Paper
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {upcomingPresentations.map((scheduled) => (
            <Card key={scheduled.id} className={
              scheduled.presenterId === currentUserId ? 'border-primary' : ''
            }>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatJournalClubDate(scheduled.presentationDate)}
                      </span>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {formatJournalClubTime(scheduled.presentationDate)}
                      </span>
                      {scheduled.presenterId === currentUserId && (
                        <Badge variant="default">You're presenting this</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold mb-1">{scheduled.entry.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {scheduled.entry.authors.slice(0, 3).join(', ')}
                      {scheduled.entry.authors.length > 3 && ' et al.'}
                      {scheduled.entry.year && ` (${scheduled.entry.year})`}
                    </p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Presenter: {scheduled.presenterName}</span>
                    </div>
                  </div>
                  {(canManage || scheduled.presenterId === currentUserId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsPresented(scheduled.entry.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Presented
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Past Presentations */}
      {pastPresentations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Past Presentations</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPastPresentations(!showPastPresentations)}
              >
                {showPastPresentations ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {showPastPresentations && (
            <CardContent className="space-y-4">
              {pastPresentations.map((scheduled) => (
                <div key={scheduled.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        {formatJournalClubDate(scheduled.presentationDate)}
                      </span>
                    </div>
                    <h4 className="font-medium">{scheduled.entry.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      Presenter: {scheduled.presenterName}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Schedule a Paper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Paper</label>
                <Select value={selectedEntryId} onValueChange={(value) => setSelectedEntryId(value || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a paper to schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    {unscheduledEntries.map((unscheduled) => (
                      <SelectItem key={unscheduled.entry.id} value={unscheduled.entry.id}>
                        {unscheduled.entry.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Presentation Date & Time</label>
                <input
                  type="datetime-local"
                  value={presentationDate}
                  onChange={(e) => setPresentationDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Presenter</label>
                <Select value={selectedPresenterId} onValueChange={(value) => setSelectedPresenterId(value || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a presenter" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.user.id} value={member.user.id}>
                        {member.user.name || 'User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSchedulePresentation}
                  disabled={!!scheduling}
                  className="flex-1"
                >
                  {!!scheduling ? 'Scheduling...' : 'Schedule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
