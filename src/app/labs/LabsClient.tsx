"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { 
  Building2, 
  Plus, 
  Users, 
  Check, 
  X, 
  Mail, 
  Shield,
  Calendar,
  Loader2,
  Crown,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  userRole: 'MEMBER' | 'ADMIN';
  joinedAt: string;
  _count: {
    members: number;
  };
  members?: LabMember[];
}

export default function LabsClient() {
  const { data: session } = useSession();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [newLab, setNewLab] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [userInstitution, setUserInstitution] = useState<Institution | null>(null);

  useEffect(() => {
    fetchLabs();
    fetchUserInstitution();
  }, []);

  const fetchLabs = async () => {
    try {
      const response = await fetch('/api/labs');
      if (response.ok) {
        const data = await response.json();
        setLabs(data);
      }
    } catch (error) {
      toast.error("Failed to load labs");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInstitution = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.institution) {
          setUserInstitution(data.institution);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user institution");
    }
  };

  const handleCreateLab = async () => {
    if (!newLab.name.trim()) {
      toast.error("Lab name is required");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLab)
      });

      if (response.ok) {
        const lab = await response.json();
        setLabs(prev => [...prev, lab]);
        setNewLab({ name: '', description: '' });
        setShowCreateModal(false);
        toast.success("Lab created successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create lab");
      }
    } catch (error) {
      toast.error("Failed to create lab");
    } finally {
      setCreating(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationEmail.trim()) {
      toast.error("Email is required");
      return;
    }

    setVerifyingEmail(true);
    try {
      const response = await fetch('/api/auth/verify-institution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Verification code sent to ${verificationEmail}`);
        if (data.newInstitution) {
          toast.info(`New institution registered: ${data.institutionName}`);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send verification code");
      }
    } catch (error) {
      toast.error("Failed to send verification code");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleConfirmCode = async () => {
    if (!verificationCode.trim()) {
      toast.error("Verification code is required");
      return;
    }

    setConfirmingCode(true);
    try {
      const response = await fetch('/api/auth/confirm-institution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      });

      if (response.ok) {
        const data = await response.json();
        setUserInstitution({ name: data.institutionName, shortName: '', domain: verificationEmail.split('@')[1], id: '' });
        setVerificationCode('');
        setVerificationEmail('');
        setShowVerifyModal(false);
        toast.success("Institution verified successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to verify code");
      }
    } catch (error) {
      toast.error("Failed to verify code");
    } finally {
      setConfirmingCode(false);
    }
  };

  const handleJoinLab = async (labId: string) => {
    try {
      const response = await fetch(`/api/labs/${labId}`, {
        method: 'POST'
      });

      if (response.ok) {
        const lab = await response.json();
        setLabs(prev => [...prev.filter(l => l.id !== labId), lab]);
        toast.success("Joined lab successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to join lab");
      }
    } catch (error) {
      toast.error("Failed to join lab");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-[var(--muted-foreground)]">Loading labs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Research Labs</h1>
        <p className="text-[var(--muted-foreground)]">
          Connect with researchers at your institution
        </p>
      </div>

      {/* Institution Status */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {userInstitution ? (
                <>
                  <Shield className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Verified Institution</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{userInstitution.name}</p>
                  </div>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 text-[var(--muted-foreground)]" />
                  <div>
                    <p className="font-medium">Institution Not Verified</p>
                    <p className="text-sm text-[var(--muted-foreground)]">Verify your institutional email to join or create labs</p>
                  </div>
                </>
              )}
            </div>
            {!userInstitution && (
              <Button onClick={() => setShowVerifyModal(true)}>
                Verify Institution
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {userInstitution && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Lab
          </Button>
        </div>
      )}

      {/* Labs List */}
      {labs.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
          <p className="text-[var(--muted-foreground)] mb-4">
            {userInstitution ? "No labs at your institution yet" : "Verify your institution to see labs"}
          </p>
          {userInstitution && (
            <p className="text-sm text-[var(--muted-foreground)]">
              Create the first lab at {userInstitution.name}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {labs.map((lab) => (
            <Card key={lab.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{lab.name}</h3>
                      {lab.isVerified && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {lab.userRole === 'ADMIN' ? (
                          <><Crown className="w-3 h-3 mr-1" />Admin</>
                        ) : (
                          <><User className="w-3 h-3 mr-1" />Member</>
                        )}
                      </Badge>
                    </div>
                    
                    {lab.description && (
                      <p className="text-[var(--muted-foreground)] mb-3">{lab.description}</p>
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
                        Joined {new Date(lab.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <Button asChild>
                    <a href={`/labs/${lab.slug}`}>
                      View Lab
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Lab Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Lab</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Lab Name</label>
              <Input
                value={newLab.name}
                onChange={(e) => setNewLab({ ...newLab, name: e.target.value })}
                placeholder="e.g., Machine Learning Research Lab"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description (optional)</label>
              <Textarea
                value={newLab.description}
                onChange={(e) => setNewLab({ ...newLab, description: e.target.value })}
                placeholder="Describe your lab's research focus..."
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateLab} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Lab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Institution Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Your Institution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Use your institutional email address to verify your affiliation
            </p>
            
            {!verifyingEmail && !confirmingCode && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Institutional Email</label>
                  <Input
                    type="email"
                    value={verificationEmail}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    placeholder="your.name@university.edu"
                  />
                </div>
                <Button onClick={handleVerifyEmail} className="w-full">
                  Send Verification Code
                </Button>
              </>
            )}

            {verifyingEmail && (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-[var(--muted-foreground)]">Sending verification code...</p>
              </div>
            )}

            {!verifyingEmail && verificationEmail && !confirmingCode && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Verification Code</label>
                  <Input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                </div>
                <Button onClick={handleConfirmCode} className="w-full">
                  Verify Code
                </Button>
              </>
            )}

            {confirmingCode && (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-[var(--muted-foreground)]">Verifying...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
