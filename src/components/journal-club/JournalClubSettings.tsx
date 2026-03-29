'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    votingEnabled: true
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
        body: JSON.stringify(settings)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Journal Club Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Meeting Frequency</label>
            <Select value={settings.meetingFrequency} onValueChange={(value) => setSettings(prev => ({ ...prev, meetingFrequency: value as 'weekly' | 'biweekly' | 'monthly' }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Next Meeting Date</label>
            <input
              type="date"
              value={settings.nextMeetingDate ? settings.nextMeetingDate : ''}
              onChange={(e) => setSettings(prev => ({ ...prev, nextMeetingDate: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Meeting Day of Week</label>
            <Select
              value={settings.meetingDayOfWeek?.toString() || ''}
              onValueChange={(value) => setSettings(prev => ({
                ...prev,
                meetingDayOfWeek: value === '' ? undefined : (value ? parseInt(value, 10) : undefined)
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select day (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific day</SelectItem>
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
            <label className="text-sm font-medium mb-2 block">Enable Voting</label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="votingEnabled"
                checked={settings.votingEnabled ?? true}
                onChange={(e) => setSettings(prev => ({ ...prev, votingEnabled: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="votingEnabled" className="text-sm text-muted-foreground">
                Allow members to vote on papers for future discussions
              </label>
            </div>
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
              <Settings className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-medium">Journal Club Management</h4>
                <p className="text-sm text-muted-foreground">
                  Your journal club is ready to use. Members can join discussions, vote on papers, and participate in scheduling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
