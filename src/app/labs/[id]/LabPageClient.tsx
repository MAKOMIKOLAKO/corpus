"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Calendar,
  Shield,
  Crown,
  User,
  Mail,
  MessageSquare,
  BookOpen,
  TrendingUp,
  Plus,
  Settings,
  Loader2,
  ExternalLink,
  Check,
  X,
  UserPlus,
  UserMinus,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Institution {
  id: string;
  name: string;
  shortName: string;
  domain: string;
}

interface LabMember {
  id: string;
  userId: string;
  role: 'MEMBER' | 'ADMIN';
  joinedAt: string;
  user: {
    id: string;
    name?: string;
    username?: string;
    institutionVerifiedAt: string | null;
  };
}

interface Lab {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isVerified: boolean;
  createdAt: string;
  institution: Institution;
  userRole: 'MEMBER' | 'ADMIN' | null;
  joinedAt?: string;
  members: LabMember[];
  _count: {
    members: number;
  };
}

interface TopPaper {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  contentType: string;
  saveCount: number;
}

interface LabPageClientProps {
  initialLab: Lab;
}

export default function LabPageClient({ initialLab }: LabPageClientProps) {
  const { data: session } = useSession();
  const [lab, setLab] = useState<Lab>(initialLab);
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [editName, setEditName] = useState(lab.name);
  const [editDescription, setEditDescription] = useState(lab.description || '');
  const [inviting, setInviting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [topPapers, setTopPapers] = useState<TopPaper[]>([]);
  const [activeMembers, setActiveMembers] = useState<LabMember[]>([]);

  const isAdmin = lab.userRole === 'ADMIN';
  const isMember = lab.userRole !== null;

  const fetchLabStats = useCallback(async () => {
    try {
      // TODO: Implement lab stats API
      // For now, using placeholder data
      setTopPapers([]);
      setActiveMembers(lab.members.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch lab stats");
    }
  }, [lab.members]);

  useEffect(() => {
    fetchLabStats();
  }, [lab.id, fetchLabStats]);

  const handleJoinLab = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/labs/${lab.id}`, {
        method: 'POST'
      });

      if (response.ok) {
        const updatedLab = await response.json();
        setLab(prev => ({ ...prev, ...updatedLab }));
        toast.success("Joined lab successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to join lab");
      }
    } catch (error) {
      toast.error("Failed to join lab");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveLab = async () => {
    if (!confirm("Are you sure you want to leave this lab?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/labs/${lab.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setLab(prev => ({ ...prev, userRole: null, joinedAt: undefined }));
        toast.success("Left lab successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to leave lab");
      }
    } catch (error) {
      toast.error("Failed to leave lab");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setInviting(true);
    try {
      // Find user by email
      const userResponse = await fetch(`/api/users/search?email=${encodeURIComponent(inviteEmail)}`);
      if (!userResponse.ok) {
        toast.error("User not found");
        return;
      }

      const user = await userResponse.json();

      // Add member
      const response = await fetch(`/api/labs/${lab.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        setInviteEmail('');
        setShowInviteModal(false);
        toast.success("Member added successfully");
        // Refresh lab data
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add member");
      }
    } catch (error) {
      toast.error("Failed to add member");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateLab = async () => {
    if (!editName.trim()) {
      toast.error("Lab name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/labs/${lab.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription })
      });

      if (response.ok) {
        setLab(prev => ({ ...prev, name: editName, description: editDescription }));
        setEditName(editName);
        setEditDescription(editDescription);
        setShowEditModal(false);
        toast.success("Lab updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update lab");
      }
    } catch (error) {
      toast.error("Failed to update lab");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: 'MEMBER' | 'ADMIN') => {
    try {
      const response = await fetch(`/api/labs/${lab.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      if (response.ok) {
        setLab(prev => ({
          ...prev,
          members: prev.members.map(m =>
            m.id === memberId ? { ...m, role } : m
          )
        }));
        toast.success("Role updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(`/api/labs/${lab.id}/members/${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setLab(prev => ({
          ...prev,
          members: prev.members.filter(m => m.id !== memberId)
        }));
        toast.success("Member removed successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to remove member");
      }
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{lab.name}</h1>
              {lab.isVerified && (
                <Badge variant="secondary">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            {lab.description && (
              <p className="text-[var(--muted-foreground)] mb-4">{lab.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {lab.institution.name}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {lab._count.members} members
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {new Date(lab.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMember ? (
              <>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                        Edit Lab
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowInviteModal(true)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button variant="outline" onClick={handleLeaveLab} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Leave Lab"}
                </Button>
              </>
            ) : (
              <Button onClick={handleJoinLab} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join Lab"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members ({lab.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lab.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm font-medium">
                      {member.user.name?.[0] || member.user.username?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user.name || member.user.username}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'ADMIN' ? 'secondary' : 'outline'} className="text-xs">
                      {member.role === 'ADMIN' ? (
                        <><Crown className="w-3 h-3 mr-1" />Admin</>
                      ) : (
                        <><User className="w-3 h-3 mr-1" />Member</>
                      )}
                    </Badge>
                    {isAdmin && member.userId !== session?.user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleUpdateMemberRole(
                              member.id,
                              member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
                            )}
                          >
                            {member.role === 'ADMIN' ? 'Make Member' : 'Make Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600"
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Papers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Top Papers This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPapers.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                No papers saved this week
              </p>
            ) : (
              <div className="space-y-3">
                {topPapers.map((paper, index) => (
                  <div key={paper.id} className="flex items-start gap-3">
                    <span className="text-sm font-bold text-[var(--muted-foreground)] w-4">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{paper.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {paper.authors.slice(0, 2).join(", ")}
                        {paper.authors.length > 2 && " et al."}
                      </p>
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {paper.saveCount} saves
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
              Activity feed coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invite Member Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Enter the email of a verified member from {lab.institution.name}
            </p>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@university.edu"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteMember} disabled={inviting}>
                {inviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Lab Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lab</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Lab Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLab} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
