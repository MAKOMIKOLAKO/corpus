'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, User, Edit2, Check, X, Eye, EyeOff, FlaskConical } from 'lucide-react';
import { RESEARCH_INTERESTS, INTEREST_CATEGORIES, getInterestsByCategory } from '@/lib/researchInterests';

export default function AccountPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [profile, setProfile] = useState<{ username: string | null; bio: string | null; showSignals: boolean; name: string | null; institution?: any; hasPassword?: boolean } | null>(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileUsername, setProfileUsername] = useState('');
    const [profileBio, setProfileBio] = useState('');
    const [profileName, setProfileName] = useState('');
    const [showSignals, setShowSignals] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [currentInterests, setCurrentInterests] = useState<string[]>([]);
    const [editingInterests, setEditingInterests] = useState(false);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [savingInterests, setSavingInterests] = useState(false);
    const [interestsMsg, setInterestsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [interestsSearch, setInterestsSearch] = useState('');
    const [interestsCategory, setInterestsCategory] = useState('All');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteMsg, setDeleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchProfile();
        fetchResearchInterests();
    }, []);

    useEffect(() => {
        if (window.location.hash === '#username' && profile) {
            const element = document.getElementById('username');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    setEditingProfile(true);
                    setProfileMsg(null);
                    const input = document.getElementById('settingsUsername') as HTMLInputElement;
                    if (input) { input.focus(); input.select(); }
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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        setChangingPassword(true);
        setPasswordMsg(null);
        try {
            const res = await fetch('/api/user/password', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setPasswordMsg({ type: 'success', text: 'Password updated successfully.' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setPasswordMsg({ type: 'error', text: data.error || 'Failed to update password' });
            }
        } catch {
            setPasswordMsg({ type: 'error', text: 'Failed to update password' });
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'delete my account') return;
        if (profile?.hasPassword && !deletePassword) return;
        setDeletingAccount(true);
        setDeleteMsg(null);
        try {
            const res = await fetch('/api/user/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmText: deleteConfirmText, password: deletePassword || undefined }),
            });
            if (res.ok) {
                await signOut({ redirect: false });
                router.push('/account/deleted');
            } else {
                const data = await res.json();
                setDeleteMsg({ type: 'error', text: data.error || 'Failed to delete account' });
            }
        } catch {
            setDeleteMsg({ type: 'error', text: 'Failed to delete account' });
        } finally {
            setDeletingAccount(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl [&_[data-slot=card]]:ring-0 [&_[data-slot=card]]:hover:ring-0 [&_[data-slot=card]]:border [&_[data-slot=card]]:border-border [&_[data-slot=card-header]]:px-6 [&_[data-slot=card-header]]:pt-6 [&_[data-slot=card-content]]:px-6 [&_[data-slot=card-content]]:pb-6">
            <div>
                <h1 className="text-2xl font-serif font-medium tracking-tight">account settings</h1>
                <p className="text-sm text-muted-foreground">manage your account.</p>
            </div>

            {/* 1. Profile */}
            <Card id="username">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-serif font-medium text-lg text-foreground">
                            <User className="w-5 h-5" /> Profile
                        </span>
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
                                <Input id="settingsName" type="text" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your name" maxLength={100} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="settingsUsername">Username</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm select-none">@</span>
                                    <Input id="settingsUsername" value={profileUsername} onChange={e => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} maxLength={20} className="pl-7" placeholder="yourhandle" />
                                </div>
                                <p className="text-xs text-[var(--muted-foreground)]">3–20 characters: lowercase letters, numbers, underscores</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="settingsBio">Bio <span className="font-normal text-[var(--muted-foreground)]">(optional)</span></Label>
                                <textarea id="settingsBio" value={profileBio} onChange={e => setProfileBio(e.target.value)} maxLength={160} rows={3} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" placeholder="A short description about you…" />
                                <p className="text-xs text-[var(--muted-foreground)] text-right">{profileBio.length}/160</p>
                            </div>
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
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showSignals ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${showSignals ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            {profileMsg && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${profileMsg.type === 'success' ? 'bg-accent/10 text-content-primary border border-border-strong' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                    {profileMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {profileMsg.text}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button type="submit" disabled={savingProfile}>{savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</Button>
                                <Button type="button" variant="outline" onClick={() => { setEditingProfile(false); setProfileUsername(profile?.username || ''); setProfileBio(profile?.bio || ''); setProfileName(profile?.name || ''); setProfileMsg(null); }}>Cancel</Button>
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
                                        <><Eye className="w-4 h-4 text-[var(--muted-foreground)]" /><span className="text-sm">Activity visible to connections</span></>
                                    ) : (
                                        <><EyeOff className="w-4 h-4 text-[var(--muted-foreground)]" /><span className="text-sm">Activity hidden from feed</span></>
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

            {/* 2. Research Interests */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-serif font-medium text-lg text-foreground">
                            <FlaskConical className="w-5 h-5" /> Research Interests
                        </span>
                        {!editingInterests && (
                            <button onClick={() => { setEditingInterests(true); setInterestsMsg(null); setSelectedInterests(currentInterests); }} className="inline-flex items-center gap-1 text-sm font-normal text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                                <Edit2 className="w-4 h-4" /> Edit
                            </button>
                        )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">These topics personalize your discovery feed and paper recommendations.</p>
                </CardHeader>
                <CardContent>
                    {editingInterests ? (
                        <div className="space-y-4">
                            <input type="text" value={interestsSearch} onChange={(e) => setInterestsSearch(e.target.value)} placeholder="Search topics..." className="w-full px-3 py-2 rounded-lg border border-border bg-card text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-ring" />
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                <button onClick={() => setInterestsCategory('All')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${interestsCategory === 'All' ? 'bg-accent text-accent-foreground' : 'bg-surface-raised text-content-secondary hover:text-content-primary'}`}>All</button>
                                {INTEREST_CATEGORIES.map((category) => (
                                    <button key={category} onClick={() => setInterestsCategory(category)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${interestsCategory === category ? 'bg-accent text-accent-foreground' : 'bg-surface-raised text-content-secondary hover:text-content-primary'}`}>{category}</button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(() => {
                                    const interestsByCategory = getInterestsByCategory();
                                    const filtered = interestsSearch
                                        ? RESEARCH_INTERESTS.filter((i) => i.label.toLowerCase().includes(interestsSearch.toLowerCase()))
                                        : (interestsCategory === 'All' ? RESEARCH_INTERESTS : interestsByCategory[interestsCategory] || []);
                                    return filtered.map((interest) => {
                                        const isSelected = selectedInterests.includes(interest.id);
                                        const isMaxed = selectedInterests.length >= 10 && !isSelected;
                                        return (
                                            <button key={interest.id} onClick={() => { if (isMaxed) return; if (isSelected) { setSelectedInterests(selectedInterests.filter((id) => id !== interest.id)); } else { setSelectedInterests([...selectedInterests, interest.id]); } }} disabled={isMaxed} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${isSelected ? 'bg-accent text-accent-foreground' : 'bg-surface-raised text-content-secondary hover:text-content-primary'} ${isMaxed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}>
                                                {isSelected && <Check className="inline w-3 h-3 mr-1" />}
                                                {interest.label}
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                            <p className="text-xs text-content-tertiary">{selectedInterests.length} / 10 selected{selectedInterests.length === 10 && <span className="ml-1 text-accent">— maximum reached</span>}</p>
                            {interestsMsg && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${interestsMsg.type === 'success' ? 'bg-accent/10 text-content-primary border border-border-strong' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                    {interestsMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}{interestsMsg.text}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={handleSaveInterests} disabled={savingInterests || selectedInterests.length === 0}>{savingInterests ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Interests'}</Button>
                                <Button variant="outline" onClick={() => { setEditingInterests(false); setSelectedInterests(currentInterests); setInterestsMsg(null); }}>Cancel</Button>
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
                                        return interest ? <span key={id} className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-raised text-content-secondary">{interest.label}</span> : null;
                                    })}
                                </div>
                            )}
                            {interestsMsg && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${interestsMsg.type === 'success' ? 'bg-accent/10 text-content-primary border border-border-strong' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                    {interestsMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}{interestsMsg.text}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. Account */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-serif font-medium text-lg text-foreground">Account</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                            <p className="text-sm mt-0.5">{session?.user?.email}</p>
                        </div>
                        <div className="pt-3 border-t border-border">
                            <p className="text-sm text-muted-foreground">Corpus is free during beta. All features are available to everyone.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 4. Security */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-serif font-medium text-lg text-foreground">Security</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                        </div>
                        {passwordMsg && (
                            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${passwordMsg.type === 'success' ? 'bg-accent/10 text-content-primary border border-border-strong' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                                {passwordMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {passwordMsg.text}
                            </div>
                        )}
                        <Button type="submit" disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}>
                            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* 5. Danger Zone */}
            <Card className="border-destructive/30">
                <CardHeader>
                    <CardTitle className="font-serif font-medium text-lg text-destructive">Danger Zone</CardTitle>
                </CardHeader>
                <CardContent>
                    {!showDeleteConfirm ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data. This cannot be undone.</p>
                            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Delete Account</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Type <strong>delete my account</strong> to confirm. This will permanently remove your account, all collections, and all saved papers.</p>
                            <Input value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="delete my account" />
                            {profile?.hasPassword && (
                                <div className="space-y-1">
                                    <Label htmlFor="deletePassword">Confirm your password</Label>
                                    <Input id="deletePassword" type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} autoComplete="current-password" />
                                </div>
                            )}
                            {deleteMsg && (
                                <div className="p-3 rounded-lg flex items-center gap-2 text-sm bg-destructive/10 text-destructive border border-destructive/20">
                                    <XCircle className="w-4 h-4" />{deleteMsg.text}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount || deleteConfirmText !== 'delete my account' || (Boolean(profile?.hasPassword) && !deletePassword)}>
                                    {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Permanently Delete Account'}
                                </Button>
                                <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeletePassword(''); setDeleteMsg(null); }}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
