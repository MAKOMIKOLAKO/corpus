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
    meetingTime: '',
    timezone: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (metadata?.isJournalClub) {
      setSettings(metadata as JournalClubMetadata);
    }
  }, [metadata]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/journal-club/${collectionId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingFrequency: settings.meetingFrequency,
          nextMeetingDate: settings.nextMeetingDate,
          meetingDayOfWeek: settings.meetingDayOfWeek,
          meetingTime: settings.meetingTime,
          timezone: settings.timezone
        })
      });

      if (!response.ok) {
        toast.error('Failed to update settings');
        return;
      }

      const updatedCollection = await response.json();
      onUpdate(updatedCollection.metadata as JournalClubMetadata);
      toast.success('Journal club settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
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

  const handleTimezoneChange = (timezone: string) => {
    setSettings(prev => ({ ...prev, timezone }));
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
              onValueChange={(value) => value && handleFrequencyChange(value)}
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
              value={settings.nextMeetingDate ? new Date(settings.nextMeetingDate).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleDateChange(new Date(e.target.value).toISOString())}
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
              value={settings.meetingTime || ''}
              onChange={(e) => handleTimeChange(e.target.value)}
              placeholder="14:00"
            />
          </div>

          {/* Timezone */}
          <div className="md:col-span-2">
            <Label htmlFor="timezone">Timezone (Optional)</Label>
            <Input
              id="timezone"
              type="text"
              value={settings.timezone || ''}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              placeholder="e.g., America/New_York"
            />
            <p className="text-xs text-muted-foreground mt-1">
              IANA timezone identifier (e.g., America/New_York, Europe/London)
            </p>
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
                  How often your journal club meets. This helps with scheduling and planning.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Meeting Schedule</h4>
                <p className="text-sm text-muted-foreground">
                  Set the next meeting date and optionally specify a recurring day and time for future meetings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
