'use client';

import { useState, useEffect } from 'react';
import { Settings, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { JournalClubMetadata } from '@/lib/journalClub';

interface JournalClubSettingsProps {
  collectionId: string;
  metadata: any;
  onUpdate: (updatedMetadata: JournalClubMetadata) => void;
}

export default function JournalClubSettings({ collectionId, metadata, onUpdate }: JournalClubSettingsProps) {
  const [settings, setSettings] = useState<JournalClubMetadata>({
    isJournalClub: true,
    meetingFrequency: 'weekly',
    nextMeetingDate: '',
    meetingDayOfWeek: undefined,
    meetingTime: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (metadata?.isJournalClub) {
      setSettings(metadata as JournalClubMetadata);
    }
  }, [metadata]);

  const handleSave = async () => {
    if (saving) return; // Prevent double clicks

    setSaving(true);
    try {
      const response = await fetch(`/api/journal-club/${collectionId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingFrequency: settings.meetingFrequency,
          nextMeetingDate: settings.nextMeetingDate,
          meetingDayOfWeek: settings.meetingDayOfWeek,
          meetingTime: settings.meetingTime
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error('You do not have permission to update journal club settings.');
        } else if (response.status === 404) {
          toast.error('Journal club not found.');
        } else {
          toast.error('Failed to update settings');
        }
        return;
      }

      const updatedCollection = await response.json();
      onUpdate(updatedCollection.metadata as JournalClubMetadata);
      toast.success('Journal club settings updated successfully');
    } catch (error) {
      console.error('Error updating journal club settings:', error);
      toast.error('Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFrequencyChange = (frequency: 'weekly' | 'biweekly' | 'monthly') => {
    setSettings(prev => ({ ...prev, meetingFrequency: frequency }));
  };

  const handleDateChange = (date: string) => {
    setSettings(prev => ({ ...prev, nextMeetingDate: date }));
  };

  const handleTimeChange = (time: string) => {
    setSettings(prev => ({ ...prev, meetingTime: time }));
  };

  const handleDayOfWeekChange = (day: string) => {
    setSettings(prev => ({ ...prev, meetingDayOfWeek: parseInt(day) }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Journal Club Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meeting Frequency */}
          <div>
            <Label htmlFor="frequency">Meeting Frequency</Label>
            <Select
              value={settings.meetingFrequency}
              onValueChange={(value) => value && handleFrequencyChange(value as any)}
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

          {/* Next Meeting Date */}
          <div>
            <Label htmlFor="nextMeeting">Next Meeting Date</Label>
            <Input
              id="nextMeeting"
              type="datetime-local"
              value={settings.nextMeetingDate}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>

          {/* Meeting Day of Week */}
          <div>
            <Label htmlFor="dayOfWeek">Meeting Day of Week (Optional)</Label>
            <Select
              value={settings.meetingDayOfWeek?.toString() || ''}
              onValueChange={(value) => value && handleDayOfWeekChange(value)}
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

          {/* Meeting Time */}
          <div>
            <Label htmlFor="meetingTime">Meeting Time (Optional)</Label>
            <Input
              id="meetingTime"
              type="time"
              value={settings.meetingTime}
              onChange={(e) => handleTimeChange(e.target.value)}
            />
          </div>

        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {/* Info Section */}
        <div className="border-t pt-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Meeting Frequency</h4>
                <p className="text-sm text-muted-foreground">
                  Set how often your journal club meets. This helps with scheduling and reminders.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Meeting Schedule</h4>
                <p className="text-sm text-muted-foreground">
                  Configure when and where your journal club meets. Members can see these details in the Schedule tab.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
