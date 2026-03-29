'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plan } from '@prisma/client';

interface CreateJournalClubButtonProps {
  collectionId: string;
  userPlan: Plan;
  userRole: 'ADMIN' | 'CONTRIBUTOR' | 'VIEWER' | null;
  hasActiveAlerts?: boolean;
  onUpdate: (updatedCollection: any) => void;
}

export default function CreateJournalClubButton({
  collectionId,
  userPlan,
  userRole,
  hasActiveAlerts = false,
  onUpdate
}: CreateJournalClubButtonProps) {
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (creating) return; // Prevent double clicks

    setCreating(true);
    try {
      const response = await fetch('/api/journal-club/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId })
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error === 'journal_club_pro_only') {
          toast.error('Journal Club is a Pro feature. Please upgrade to continue.');
        } else if (error.error === 'collection_has_active_alerts') {
          toast.error('Collections used by active alerts cannot be converted to Journal Club. Pause or delete those alerts first.');
        } else if (response.status === 403) {
          toast.error('You do not have permission to create a journal club.');
        } else if (response.status === 404) {
          toast.error('Collection not found.');
        } else {
          toast.error(error.error || 'Failed to create journal club');
        }
        return;
      }

      const updatedCollection = await response.json();
      onUpdate(updatedCollection);
      toast.success('Journal club created successfully!');
    } catch (error) {
      console.error('Error creating journal club:', error);
      toast.error('Failed to create journal club. Please try again.');
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
    <Button
      onClick={handleCreate}
      disabled={creating || hasActiveAlerts}
      title={hasActiveAlerts ? 'Collections used by active alerts cannot be converted to Journal Club.' : undefined}
      className="w-full sm:w-auto"
    >
      <Calendar className="h-4 w-4 mr-2" />
      {creating ? 'Creating...' : hasActiveAlerts ? 'Used by Active Alerts' : 'Convert to Journal Club'}
    </Button>
  );
}
