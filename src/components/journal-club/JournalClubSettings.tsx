'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        body: JSON.stringify({})
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
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Journal Club Settings</h3>
          <p className="text-muted-foreground mb-6">
            This journal club is currently active. Members can participate in discussions, voting, and scheduling presentations.
          </p>
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
