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
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/journal-club/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId
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
    <Button onClick={handleCreate} disabled={creating}>
      <Calendar className="h-4 w-4 mr-2" />
      {creating ? 'Creating...' : 'Convert to Journal Club'}
    </Button>
  );
}
