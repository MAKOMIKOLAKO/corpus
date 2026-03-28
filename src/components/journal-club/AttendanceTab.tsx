'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatJournalClubDate } from '@/lib/journalClub';
import { toast } from 'sonner';

interface CollectionMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    username: string;
  };
}

interface Attendance {
  id: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  recordedAt: string;
  user: {
    id: string;
    name: string | null;
    username: string;
  };
}

interface Meeting {
  id: string;
  date: string;
  notes: string | null;
  attendances: Attendance[];
}

interface AttendanceTabProps {
  collectionId: string;
  isJournalClub: boolean;
  canManage: boolean;
  currentUserId: string;
}

export default function AttendanceTab({ collectionId, isJournalClub, canManage, currentUserId }: AttendanceTabProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<CollectionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState<string | null>(null);
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [newMeetingDate, setNewMeetingDate] = useState('');
  const [newMeetingNotes, setNewMeetingNotes] = useState('');
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isJournalClub) {
      fetchAttendanceData();
    }
  }, [isJournalClub, collectionId]);

  const fetchAttendanceData = async () => {
    try {
      const [meetingsRes, membersRes] = await Promise.all([
        fetch(`/api/journal-club/${collectionId}/meetings`),
        fetch(`/api/collections/${collectionId}/members`)
      ]);

      if (!meetingsRes.ok || !membersRes.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const [meetingsData, membersData] = await Promise.all([
        meetingsRes.json(),
        membersRes.json()
      ]);

      setMeetings(meetingsData || []);
      setMembers(membersData || []);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!newMeetingDate) {
      toast.error('Please select a meeting date');
      return;
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newMeetingDate)) {
      toast.error('Invalid date format');
      return;
    }

    if (!canManage) {
      toast.error('You do not have permission to create meetings');
      return;
    }

    setRecording('creating');
    try {
      const response = await fetch('/api/journal-club/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          date: newMeetingDate, // Send as date-only string
          notes: newMeetingNotes.trim() || null
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('You do not have permission to create meetings');
        } else {
          toast.error('Failed to create meeting');
        }
        return;
      }

      toast.success('Meeting created successfully');
      setShowCreateMeeting(false);
      setNewMeetingDate('');
      setNewMeetingNotes('');
      fetchAttendanceData();
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting');
    } finally {
      setRecording(null);
    }
  };

  const handleRecordAttendance = async (meetingId: string, memberId: string, status: 'PRESENT' | 'ABSENT' | 'EXCUSED') => {
    if (!canManage) {
      toast.error('You do not have permission to record attendance');
      return;
    }

    setRecording(`${meetingId}-${memberId}`);
    try {
      const response = await fetch('/api/journal-club/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          memberId,
          status
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('You do not have permission to record attendance');
        } else {
          toast.error('Failed to record attendance');
        }
        return;
      }

      toast.success('Attendance recorded successfully');
      fetchAttendanceData();
    } catch (error) {
      console.error('Error recording attendance:', error);
      toast.error('Failed to record attendance');
    } finally {
      setRecording(null);
    }
  };

  const toggleMeetingExpanded = (meetingId: string) => {
    const newExpanded = new Set(expandedMeetings);
    if (newExpanded.has(meetingId)) {
      newExpanded.delete(meetingId);
    } else {
      newExpanded.add(meetingId);
    }
    setExpandedMeetings(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'ABSENT':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'EXCUSED':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'ABSENT':
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      case 'EXCUSED':
        return <Badge className="bg-amber-100 text-amber-800">Excused</Badge>;
      default:
        return null;
    }
  };

  const getAttendanceSummary = (attendances: Attendance[]) => {
    const present = attendances.filter(a => a.status === 'PRESENT').length;
    const total = attendances.length;
    return { present, total };
  };

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
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-32 bg-muted rounded-md animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded-md animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded-md animate-pulse"></div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-6 w-40 bg-muted rounded-md animate-pulse"></div>
                    <div className="h-6 w-20 bg-muted rounded-md animate-pulse"></div>
                  </div>
                  <div className="h-4 w-3/4 bg-muted rounded-md animate-pulse"></div>
                </div>
                <div className="h-8 w-8 bg-muted rounded-md animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meetings</h2>
          <p className="text-muted-foreground">Track attendance for journal club meetings</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreateMeeting(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Meeting
          </Button>
        )}
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meetings recorded yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking attendance for your journal club meetings.
            </p>
            {canManage && (
              <Button onClick={() => setShowCreateMeeting(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Meeting
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const { present, total } = getAttendanceSummary(meeting.attendances);
            const isExpanded = expandedMeetings.has(meeting.id);

            return (
              <Card key={meeting.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">
                          {formatJournalClubDate(meeting.date)}
                        </h3>
                        <Badge variant="outline">
                          {present} / {total} present
                        </Badge>
                      </div>
                      {meeting.notes && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {meeting.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMeetingExpanded(meeting.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Attendance</h4>
                        <div className="space-y-2">
                          {members.map((member) => {
                            const attendance = meeting.attendances.find(
                              a => a.user.id === member.user.id
                            );
                            const currentStatus = attendance?.status || 'ABSENT';
                            const canUpdate = canManage || member.user.id === currentUserId;

                            return (
                              <div key={member.user.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                      {(member.user.name || member.user.username || 'U').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {member.user.name || member.user.username}
                                    </p>
                                    {member.user.id === currentUserId && (
                                      <p className="text-xs text-muted-foreground">You</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(currentStatus)}
                                  {canUpdate ? (
                                    <Select
                                      value={currentStatus}
                                      onValueChange={(value: any) =>
                                        handleRecordAttendance(meeting.id, member.user.id, value)
                                      }
                                      disabled={recording === `${meeting.id}-${member.user.id}`}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="PRESENT">Present</SelectItem>
                                        <SelectItem value="ABSENT">Absent</SelectItem>
                                        <SelectItem value="EXCUSED">Excused</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    getStatusBadge(currentStatus)
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Meeting Modal */}
      {showCreateMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Meeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Meeting Date</label>
                <input
                  type="date"
                  value={newMeetingDate}
                  onChange={(e) => setNewMeetingDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={newMeetingNotes}
                  onChange={(e) => setNewMeetingNotes(e.target.value)}
                  placeholder="Meeting notes, agenda, etc."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateMeeting(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMeeting}
                  disabled={recording === 'creating'}
                  className="flex-1"
                >
                  {recording === 'creating' ? 'Creating...' : 'Create Meeting'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
