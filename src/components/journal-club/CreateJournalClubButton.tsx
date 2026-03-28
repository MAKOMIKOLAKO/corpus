'use client';

import { useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plan } from '@prisma/client';

interface CreateJournalClubButtonProps {
  collectionId: string;
  userPlan: Plan;
  userRole: 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER' | null;
  onUpdate: (updatedCollection: any) => void;
}

export default function CreateJournalClubButton({ 
  collectionId, 
  userPlan, 
  userRole, 
  onUpdate 
}: CreateJournalClubButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [meetingFrequency, setMeetingFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [nextMeetingDate, setNextMeetingDate] = useState('');
  const [meetingDayOfWeek, setMeetingDayOfWeek] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [timezone, setTimezone] = useState('');

  const handleCreate = async () => {
    if (!nextMeetingDate) {
      toast.error('Next meeting date is required');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/journal-club/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          meetingFrequency,
          nextMeetingDate: new Date(nextMeetingDate).toISOString(),
          meetingDayOfWeek: meetingDayOfWeek ? parseInt(meetingDayOfWeek) : undefined,
          meetingTime,
          timezone
        })
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error === 'journal_club_pro_only') {
          toast.error('Journal Club is a Pro feature. Please upgrade to continue.');
        } else {
          toast.error(error.error || 'Failed to create journal club');
        }
        return;
      }

      const updatedCollection = await response.json();
      onUpdate(updatedCollection);
      setShowModal(false);
      toast.success('Journal club created successfully!');
    } catch (error) {
      console.error('Error creating journal club:', error);
      toast.error('Failed to create journal club');
    } finally {
      setCreating(false);
    }
  };

  // Check if user can create journal club
  const canCreate = userPlan === 'PRO' || userPlan === 'LIFETIME_PRO';

  if (!canCreate || userRole !== 'ADMIN') {
    return null;
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)}>
        <Calendar className="h-4 w-4 mr-2" />
        Convert to Journal Club
      </Button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Create Journal Club
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="frequency">Meeting Frequency</Label>
                <Select
                  value={meetingFrequency}
                  onValueChange={(value: any) => setMeetingFrequency(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nextMeeting">Next Meeting Date *</Label>
                <Input
                  id="nextMeeting"
                  type="datetime-local"
                  value={nextMeetingDate}
                  onChange={(e) => setNextMeetingDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dayOfWeek">Meeting Day of Week (Optional)</Label>
                <Select
                  value={meetingDayOfWeek}
                  onValueChange={setMeetingDayOfWeek}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="meetingTime">Meeting Time (Optional)</Label>
                <Input
                  id="meetingTime"
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  placeholder="14:00"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone (Optional)</Label>
                <Input
                  id="timezone"
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g., America/New_York"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  IANA timezone identifier
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : 'Create Journal Club'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
