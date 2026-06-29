'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, User, Edit2, Check, X, Eye, EyeOff, FlaskConical, Shield, AlertTriangle, Mail } from 'lucide-react';
import { RESEARCH_INTERESTS, INTEREST_CATEGORIES, getInterestsByCategory } from '@/lib/researchInterests';

export default function AccountPage() {
    const { data: session } = useSession();
    const router = useRouter();

    // Profile state
    const [profile, setProfile] = useState<{ username: string | null; bio: string | null; showSignals: boolean; name: string | null; institution?: any; emailVerified?: boolean } | null>(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileUsername, setProfileUsername] = useState('');
    const [profileBio, setProfileBio] = useState('');
    const [profileName, setProfileName] = useState('');
    const [showSignals, setShowSignals] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Research Interests state
    const [currentInterests, setCurrentInterests] = useState<string[]>([]);
    const [editingInterests, setEditingInterests] = useState(false);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [savingInterests, setSavingInterests] = useState(false);
    const [interestsMsg, setInterestsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [interestsSearch, setInterestsSearch] = useState('');
    const [interestsCategory, setInterestsCategory] = useState('All');

    // Institution verification state
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [verificationMsg, setVerificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Security state
    const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
    const [passwordResetMsg, setPasswordResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Danger zone state
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteMsg, setDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchProfile();
        fetchResearchInterests();
    }, []);

    // Handle hash navigation to username
    useEffect(() => {
        if (window.location.hash === '#username' && profile) {
            const element = document.getElementById('username');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    setEditingProfile(true);
                    setProfileMsg(null);
                    const input = document.getElementById('settingsUsername') as HTMLInputElement;
                    if (input) {
                        input.focus();
                        input.select();
                    }
                }, 500);
            }
        }
    }, [profile]);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setProfileUsername(data.username || '');
                setProfileBio(data.bio || '');
                setProfileName(data.name || '');
                setShowSignals(data.showSignals !== false);
            }
        } catch { }
    };

    const fetchResearchInterests = async () => {
        try {
            const res = await fetch('/api/research/profile');
            if (res.ok) {
                const data = await res.json();
                const domainWeights = data.domainWeights as Record<string, number> | null;
                if (domainWeights) {
                    const interestIds = Object.keys(domainWeights);
                    setCurrentInterests(interestIds);
                    setSelectedInterests(interestIds);
                }
            }
        } catch { }
    };

    const handleSaveInterests = async () => {
        setSavingInterests(true);
        setInterestsMsg(null);
        try {
            const res = await fetch('/api/user/research-interests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedInterests }),
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentInterests(selectedInterests);
                setEditingInterests(false);
                setInterestsMsg({ type: 'success', text: 'Research interests updated successfully.' });
            } else {
                setInterestsMsg({ type: 'error', text: data.error || 'Failed to update interests' });
            }
        } catch {
            setInterestsMsg({ type: 'error', text: 'Failed to update interests' });
        } finally {
            setSavingInterests(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        setProfileMsg(null);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: profileUsername, bio: profileBio, name: profileName, showSignals }),
            });
            const data = await res.json();
            if (res.ok) {
                setProfile(data);
                setEditingProfile(false);
                setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
            } else {
                setProfileMsg({ type: 'error', text: data.error || 'Failed to save profile' });
            }
        } catch {
            setProfileMsg({ type: 'error', text: 'Failed to save profile' });
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSendVerificationCode = async () => {
        if (!verificationEmail.trim()) return;

        setSendingCode(true);
        setVerificationMsg(null);
        try {
            const response = await fetch('/api/auth/verify-institution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verificationEmail.trim() }),
            });

            const data = await response.json();
            if (response.ok) {
                setVerificationMsg({ type: 'success', text: `Verification code sent to ${verificationEmail}` });
                setShowCodeInput(true);
            } else {
                setVerificationMsg({ type: 'error', text: data.error || 'Failed to send verification code' });
            }
        } catch {
            setVerificationMsg({ type: 'error', text: 'Failed to send verification code' });
        } finally {
            setSendingCode(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!verificationCode.trim()) return;

        setVerifying(true);
        setVerificationMsg(null);
        try {
            const response = await fetch('/api/auth/confirm-institution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: verificationCode.trim() }),
            });

            const data = await response.json();
            if (response.ok) {
                setVerificationMsg({ type: 'success', text: `Successfully verified with ${data.institutionName}` });
                setShowVerificationModal(false);
                setVerificationEmail('');
                setVerificationCode('');
                setShowCodeInput(false);
                fetchProfile();
            } else {
                setVerificationMsg({ type: 'error', text: data.error || 'Invalid verification code' });
            }
        } catch {
            setVerificationMsg({ type: 'error', text: 'Failed to verify code' });
        } finally {
            setVerifying(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!session?.user?.email) return;
        setSendingPasswordReset(true);
        setPasswordResetMsg(null);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: session.user.email }),
            });
            if (res.ok) {
                setPasswordResetMsg({ type: 'success', text: 'Password reset email sent. Check your inbox.' });
            } else {
                const data = await res.json();
                setPasswordResetMsg({ type: 'error', text: data.error || 'Failed to send reset email' });
            }
        } catch {
            setPasswordResetMsg({ type: 'error', text: 'Failed to send reset email' });
        } finally {
            setSendingPasswordReset(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'delete my account') return;
        setDeletingAccount(true);
        setDeleteMsg(null);
        try {
            const res = await fetch('/api/user/profile', { method: 'DELETE' });
            if (res.ok) {
                router.push('/');
            } else {
                const data = await res.json();
                setDeleteMsg({ type: 'error', text: data.error || 'Failed to delete account' });
                setDeletingAccount(false);
            }
        } catch {
            setDeleteMsg({ type: 'error', text: 'Failed to delete account' });
            setDeletingAccount(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl [&_[data-slot=card]]:ring-0 [&_[data-slot=card]]:hover:ring-0 [&_[data-slot=card]]:border [&_[data-slot=card]]:border-border [&_[data-slot=card-header]]:px-6 [&_[data-slot=card-header]]:pt-6 [&_[data-slot=card-content]]:px-6 [&_[data-slot=card-content]]:pb-6">
            <div>
                <h1 className="text-2xl font-serif font-medium tracking-tight">account settings</h1>
                <p className="text-sm text-muted-foreground">manage your account.</p>
            </div>

            {/* Beta notice */}
            <p className="text-sm text-muted-foreground">
                Corpus is free during beta. All features are available to everyone.
            </p>

            {/* Profile */}
            <Card id="username">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-serif font-medium text-lg text-foreground"><User className="w-5 h-5" /> Profile</span>
                        {!editingProfile && (
                            <button
                                onClick={() => { setEditingProfile(true); setProfileMsg(null); }}
                                className="inline-flex items-center gap-1 text-sm font-normal text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                            >
                                <Edit2 className="w-4 h-4" /> Edit
                            </button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {editingProfile ? (
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="settingsName">Name</Label>
                                <Input
                                    id="settingsName"
                                    type="text"
                                    value={profileName}
                                    onChange={e => setProfileName(e.target.value)}
                                    placeholder="Your name"
                                    maxLength={100}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="settingsUsername">Username</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm select-none">@</span>
                                    <Input
                                        id="settingsUsername"
                                        value={profileUsername}
                                        onChange={e => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        maxLength={20}
                                        className="pl-7"
                                        placeholder="yourhandle"
                                    />
                                </div>
                                <p className="text-xs text-[var(--muted-foreground)]">3–20 characters: lowercase letters, numbers, underscores</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="settingsBio">Bio <span className="font-normal text-[var(--muted-foreground)]">(optional)</span></Label>
                                <textarea
                                    id="settingsBio"
                                    value={profileBio}
                                    onChange={e => setProfileBio(e.target.value)}
                                    maxLength={160}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    placeholder="A short description about you…"
                                />
                                <p className="text-xs text-[var(--muted-foreground)] text-right">{profileBio.length}/160</p>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-2">
                                            <Eye className="w-4 h-4" />
                                            Show activity in feed
                                        </Label>
                                        <p className="text-xs text-[var(--muted-foreground)]">Allow your connections to see your saved papers and collection activity</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSignals(!showSignals)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showSignals ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${showSignals ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                            {profileMsg && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${profileMsg.type === 'success' ? 'bg-accent/10 text-content-primary border border-border-strong' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                    {profileMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {profileMsg.text}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button type="submit" disabled={savingProfile}>
                                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => { setEditingProfile(false); setProfileUsername(profile?.username || ''); setProfileBio(profile?.bio || ''); setProfileName(profile?.name || ''); setProfileMsg(null); }}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                                <p className="text-sm mt-0.5">{profile?.name || <span className="text-[var(--muted-foreground)] italic">Not set</span>}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                                <p className="text-sm mt-0.5">{profile?.username ? `@${profile.username}` : <span className="text-[var(--muted-foreground)] italic">Not set</span>}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Bio</Label>
                                <p className="text-sm mt-0.5">{profile?.bio || <span className="text-[var(--muted-foreground)] italic">Not set</span>}</p>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-muted-foreground">Privacy</Label>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {profile?.showSignals !== false ? (
                                        <>
                                            <Eye className="w-4 h-4 text-[var(--muted-foreground)]" />
                                            <span className="text-sm">Activity visible to connections</span>
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="w-4 h-4 text-[var(--muted-foreground)]" />
                                            <span className="text-sm">Activity hidden from feed</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            {profileMsg && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${profileMsg.type === 'success' ? 'bg-accent/10 text-content-primary border border-border-strong' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                    {profileMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {profileMsg.text}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Research Interests */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-serif font-medium text-lg text-foreground"><FlaskConical className="w-5 h-5" /> Research Interests</span>
                        {!editingInterests && (
                            <button
                                onClick={() => { setEditingInterests(true); setInterestsMsg(null); setSelectedInterests(currentInterests); }}
                                className="inline-flex items-center gap-1 text-sm font-normal text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                            >
                                <Edit2 className="w-4 h-4" /> Edit
                            </button>
                        )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">These topics personalize your discovery feed and paper recommendations.</p>
                </CardHeader>
                <CardContent>
                    {editingInterests ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={interestsSearch}
                                    onChange={(e) => setInterestsSearch(e.target.value)}
                                    placeholder="Search topics..."
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                <button
                                    onClick={() => setInterestsCategory('All')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${interestsCategory === 'All'
                                            ? 'bg-accent text-accent-foreground'
                                            : 'bg-surface-raised text-content-secondary hover:text-content-primary'
                                        }`}
                                >
                                    All
                                </button>
                                {INTEREST_CATEGORIES.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setInterestsCategory(category)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${interestsCategory === category
                                                ? 'bg-accent text-accent-foreground'
                                                : 'bg-surface-raised text-content-secondary hover:text-content-primary'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    const interestsByCategory = getInterestsByCategory();
                                    const filtered = interestsSearch
                                        ? RESEARCH_INTERESTS.filter((i) =>
                                            i.label.toLowerCase().includes(interestsSearch.toLowerCase())
                                        )
                                        : (interestsCategory === 'All'
                                            ? RESEARCH_INTERESTS
                                            : interestsByCategory[interestsCategory] || []);
                                    return filtered.map((interest) => {
                                        const isSelected = selectedInterests.includes(interest.id);
                                        const isMaxed = selectedInterests.length >= 10 && !isSelected;
                                        return (
                                            <button
                                                key={interest.id}
                                                onClick={() => {
                                                    if (isMaxed) return;
                                                    if (isSelected) {
                                                        setSelectedInterests(selectedInterests.filter((id) => id !== interest.id));
                                                    } else {
                                                        setSelectedInterests([...selectedInterests, interest.id]);
                                                    }
                                                }}
                                                disabled={isMaxed}
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${isSelected
                                                        ? 'bg-accent text-accent-foreground'
                                                        : 'bg-surface-raised text-content-secondary hover:text-content-primary'
                                                    } ${isMaxed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                                            >
                                                {isSelected && <Check className="inline w-3 h-3 mr-1" />}
                                                {interest.label}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>

                            <p className="text-xs text-content-tertiary">
                                {selectedInterests.length} / 10 selected
                                {selectedInterests.length === 10 && (
                                    <span className="ml-1 text-accent">— maximum reached</span>
                                )}
                            </p>

                            {interestsMsg && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${interestsMsg.type === 'success' ? 'bg-accent/10 text-content-primary border border-border-strong' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                    {interestsMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {interestsMsg.text}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button onClick={handleSaveInterests} disabled={savingInterests || selectedInterests.length === 0}>
                                    {savingInterests ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Interests'}
                                </Button>
                                <Button variant="outline" onClick={() => { setEditingInterests(false); setSelectedInterests(currentInterests); setInterestsMsg(null); }}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {currentInterests.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No interests selected yet.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {currentInterests.map((id) => {
                                        const interest = RESEARCH_INTERESTS.find((i) => i.id === id);
                                        return interest ? (
                                            <span key={id} className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-raised text-content-secondary">
                                                {interest.label}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                            {interestsMsg && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${interestsMsg.type === 'success' ? 'bg-accent/10 text-content-primary border border-border-strong' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                    {interestsMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {interestsMsg.text}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Account */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-serif font-medium text-lg text-foreground">
                        <Mail className="w-5 h-5" /> Account
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-sm">{session?.user?.email}</p>
                                {(session?.user as any)?.emailVerified ? (
                                    <span className="flex items-center gap-1 text-xs text-accent">
                                        <CheckCircle className="w-3 h-3" /> Verified
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <XCircle className="w-3 h-3" /> Not verified
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Security */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-serif font-medium text-lg text-foreground">
                        <Shield className="w-5 h-5" /> Security
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Send a password reset link to your email address.
                            </p>
                            <Button variant="outline" onClick={handlePasswordReset} disabled={sendingPasswordReset}>
                                {sendingPasswordReset ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending…
                                    </>
                                ) : (
                                    'Send password reset email'
                                )}
                            </Button>
                        </div>
                        {passwordResetMsg && (
                            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${passwordResetMsg.type === 'success' ? 'bg-accent/10 text-content-primary border border-border-strong' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                {passwordResetMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {passwordResetMsg.text}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-serif font-medium text-lg text-destructive">
                        <AlertTriangle className="w-5 h-5" /> Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        {!showDeleteConfirm ? (
                            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                                Delete account
                            </Button>
                        ) : (
                            <div className="space-y-3 border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                                <p className="text-sm font-medium">Type <span className="font-mono">delete my account</span> to confirm:</p>
                                <Input
                                    value={deleteConfirmText}
                                    onChange={e => setDeleteConfirmText(e.target.value)}
                                    placeholder="delete my account"
                                    className="border-destructive/40 focus-visible:ring-destructive"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="destructive"
                                        disabled={deleteConfirmText !== 'delete my account' || deletingAccount}
                                        onClick={handleDeleteAccount}
                                    >
                                        {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm deletion'}
                                    </Button>
                                    <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteMsg(null); }}>
                                        Cancel
                                    </Button>
                                </div>
                                {deleteMsg && (
                                    <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-destructive/10 text-destructive border border-destructive/20">
                                        <XCircle className="w-4 h-4" />
                                        {deleteMsg.text}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Institution Verification Modal */}
            {showVerificationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-background border border-border rounded-lg shadow-lg p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">Verify Institution</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowVerificationModal(false);
                                    setVerificationEmail('');
                                    setVerificationCode('');
                                    setShowCodeInput(false);
                                    setVerificationMsg(null);
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="verificationEmail">Institution Email</Label>
                                <Input
                                    id="verificationEmail"
                                    type="email"
                                    placeholder="your.name@university.edu"
                                    value={verificationEmail}
                                    onChange={(e) => setVerificationEmail(e.target.value)}
                                    disabled={sendingCode}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Use your institutional email address (.edu, .ac.uk, etc.)
                                </p>
                            </div>

                            {!showCodeInput && (
                                <Button
                                    onClick={handleSendVerificationCode}
                                    disabled={!verificationEmail.trim()}
                                    className="w-full"
                                >
                                    Send Verification Code
                                </Button>
                            )}

                            {sendingCode && (
                                <Button disabled className="w-full">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </Button>
                            )}

                            {showCodeInput && (
                                <>
                                    <div>
                                        <Label htmlFor="verificationCode">Verification Code</Label>
                                        <Input
                                            id="verificationCode"
                                            type="text"
                                            placeholder="123456"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                            disabled={verifying}
                                            maxLength={6}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Enter the 6-digit code sent to your email
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setVerificationCode('');
                                                setVerificationMsg(null);
                                            }}
                                            disabled={verifying}
                                            className="flex-1"
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleVerifyCode}
                                            disabled={verificationCode.length !== 6 || verifying}
                                            className="flex-1"
                                        >
                                            {verifying ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Verifying...
                                                </>
                                            ) : (
                                                'Verify'
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}

                            {verificationMsg && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${verificationMsg.type === 'success'
                                    ? 'bg-accent/10 text-content-primary border border-border-strong'
                                    : 'bg-destructive/10 text-destructive border border-destructive/20'
                                    }`}>
                                    {verificationMsg.type === 'success' ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : (
                                        <XCircle className="w-4 h-4" />
                                    )}
                                    {verificationMsg.text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
