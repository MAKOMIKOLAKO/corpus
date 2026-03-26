'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Gift, Loader2, CheckCircle, XCircle, CreditCard, Users, User, Edit2, Check, X, Eye, EyeOff } from 'lucide-react';
import { getUserPlan, PLAN_LIMITS } from '@/lib/plans';

export default function AccountPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [promoCode, setPromoCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [upgradeProcessed, setUpgradeProcessed] = useState(false);
    const [sharedCollectionsCount, setSharedCollectionsCount] = useState(0);
    const [loadingCollections, setLoadingCollections] = useState(true);

    // Profile state
    const [profile, setProfile] = useState<{ username: string | null; bio: string | null; showSignals: boolean; name: string | null; institution?: any } | null>(null);
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileUsername, setProfileUsername] = useState('');
    const [profileBio, setProfileBio] = useState('');
    const [profileName, setProfileName] = useState('');
    const [showSignals, setShowSignals] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Institution verification state
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [verificationMsg, setVerificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const userPlan = getUserPlan(session?.user ? {
        ...session.user,
        plan: session.user.plan as "FREE" | "PRO" | "LIFETIME_PRO"
    } : null);
    const upgraded = searchParams?.get('upgraded') === 'true';
    const userIdFromUrl = searchParams?.get('userId');
    const isLifetimePro = session?.user?.plan === 'LIFETIME_PRO';

    useEffect(() => {
        fetchSharedCollectionsCount();
        fetchProfile();
    }, []);

    // Handle hash navigation
    useEffect(() => {
        if (window.location.hash === '#username' && profile) {
            // Scroll to the username section
            const element = document.getElementById('username');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Auto-open edit mode for better UX
                setTimeout(() => {
                    setEditingProfile(true);
                    setProfileMsg(null);
                    // Focus on username input
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

    const fetchSharedCollectionsCount = async () => {
        try {
            const response = await fetch('/api/collections');
            if (response.ok) {
                const collections = await response.json();
                const sharedCount = collections.filter((c: any) => c.isOwner && c._count?.members > 0).length;
                setSharedCollectionsCount(sharedCount);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        } finally {
            setLoadingCollections(false);
        }
    };

    // Handle immediate upgrade if coming from Stripe success
    useEffect(() => {
        if (upgraded && userIdFromUrl && session?.user?.id === userIdFromUrl && !upgradeProcessed) {
            console.log("🚨 IMMEDIATE UPGRADE TRIGGERED");
            setUpgradeProcessed(true);
            upgradeUserToPro(userIdFromUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [upgraded, userIdFromUrl, session?.user?.id, upgradeProcessed]);

    const upgradeUserToPro = async (userId: string) => {
        try {
            console.log("🚨 UPGRADING USER TO PRO:", userId);
            const response = await fetch('/api/stripe/upgrade-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            if (response.ok) {
                console.log("🚨 UPGRADE SUCCESSFUL");
                // Clear URL parameters and force session refresh
                window.history.replaceState({}, '', '/account/settings');
                // Refresh session data instead of full page reload
                router.refresh();
            } else {
                console.error("🚨 UPGRADE FAILED");
            }
        } catch (error) {
            console.error("🚨 UPGRADE ERROR:", error);
        }
    };

    const handleRedeemPromo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!promoCode.trim()) return;

        setRedeeming(true);
        setMessage(null);

        try {
            const response = await fetch('/api/promo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setMessage({
                    type: 'success',
                    text: 'You now have lifetime Pro access!'
                });
                setPromoCode('');
                // Refresh the session to update the plan
                window.location.reload();
            } else {
                setMessage({
                    type: 'error',
                    text: data.error || 'Invalid promo code'
                });
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: 'Failed to redeem promo code'
            });
        } finally {
            setRedeeming(false);
        }
    };

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        try {
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error('Failed to create portal session');
                setPortalLoading(false);
            }
        } catch (error) {
            console.error('Error creating portal session:', error);
            setPortalLoading(false);
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
                setShowCodeInput(true); // Show the code input field
            } else {
                setVerificationMsg({ type: 'error', text: data.error || 'Failed to send verification code' });
            }
        } catch (error) {
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
                fetchProfile(); // Refresh profile data
            } else {
                setVerificationMsg({ type: 'error', text: data.error || 'Invalid verification code' });
            }
        } catch (error) {
            setVerificationMsg({ type: 'error', text: 'Failed to verify code' });
        } finally {
            setVerifying(false);
        }
    };

    const getPlanBadgeVariant = (plan: string) => {
        switch (plan) {
            case 'PRO':
            case 'LIFETIME_PRO':
                return 'default';
            case 'FREE':
            default:
                return 'secondary';
        }
    };

    const getPlanDisplay = (plan: string) => {
        switch (plan) {
            case 'PRO':
                return 'Pro';
            case 'LIFETIME_PRO':
                return 'Lifetime Pro';
            case 'FREE':
            default:
                return 'Free';
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Upgrade Success Banner */}
            {upgraded && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                            <h3 className="font-medium text-green-800">Welcome to Corpus Pro!</h3>
                            <p className="text-sm text-green-700">Your account has been upgraded.</p>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h1 className="text-2xl font-semibold tracking-tight">account settings</h1>
                <p className="text-sm text-muted-foreground">manage your account and subscription.</p>
            </div>

            {/* Profile */}
            <Card id="username">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><User className="w-5 h-5" /> Profile</span>
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
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showSignals ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showSignals ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                            {profileMsg && (
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
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
                                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                    {profileMsg.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {profileMsg.text}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Account & Billing
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                            <p className="text-sm">{session?.user?.email}</p>
                        </div>
                        <div>
                            <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                            <p className="text-sm">{session?.user?.name || 'Not set'}</p>
                        </div>
                        <div>
                            <Label className="text-sm font-medium text-muted-foreground">Current Plan</Label>
                            <div className="mt-1">
                                <Badge variant={getPlanBadgeVariant(userPlan)}>
                                    {getPlanDisplay(userPlan)}
                                </Badge>
                            </div>
                        </div>

                        {userPlan === 'PRO' && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Manage your subscription, update payment methods, or cancel your plan.
                                </p>
                                <Button
                                    onClick={handleManageSubscription}
                                    disabled={portalLoading}
                                >
                                    {portalLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        'Manage Subscription'
                                    )}
                                </Button>
                            </div>
                        )}

                        {userPlan === 'FREE' && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Upgrade to Pro to unlock unlimited entries and premium features.
                                </p>
                                <Button>
                                    <a href="/pricing">Upgrade to Pro</a>
                                </Button>
                            </div>
                        )}

                        {isLifetimePro && (
                            <div>
                                <p className="text-sm text-green-600 font-medium">
                                    Lifetime Pro — no billing required
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    You have lifetime access to all Pro features.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Promo Code Redemption */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gift className="w-5 h-5" />
                        Promo Code Redemption
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRedeemPromo} className="space-y-4">
                        <div>
                            <Label htmlFor="promoCode">Promo Code</Label>
                            <Input
                                id="promoCode"
                                type="text"
                                placeholder="Enter promo code"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                disabled={redeeming}
                                className="uppercase"
                            />
                        </div>
                        <Button type="submit" disabled={redeeming || !promoCode.trim()}>
                            {redeeming ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Redeeming...
                                </>
                            ) : (
                                <>
                                    <Gift className="w-4 h-4 mr-2" />
                                    Redeem Code
                                </>
                            )}
                        </Button>
                    </form>

                    {message && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                            {message.type === 'success' ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <XCircle className="w-4 h-4" />
                            )}
                            <span className="text-sm">{message.text}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Shared Collections */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Shared Collections
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loadingCollections ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading...
                            </div>
                        ) : (
                            <>
                                <div>
                                    <Label className="text-sm font-medium text-muted-foreground">Shared Collections Usage</Label>
                                    <div className="mt-2">
                                        {userPlan === 'FREE' ? (
                                            <>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium">
                                                        {sharedCollectionsCount} of {PLAN_LIMITS.FREE.sharedCollections} shared collections used
                                                    </span>
                                                    <Badge variant={sharedCollectionsCount >= PLAN_LIMITS.FREE.sharedCollections ? 'destructive' : 'secondary'}>
                                                        {sharedCollectionsCount >= PLAN_LIMITS.FREE.sharedCollections ? 'Limit Reached' : 'Active'}
                                                    </Badge>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${sharedCollectionsCount >= PLAN_LIMITS.FREE.sharedCollections
                                                            ? 'bg-red-500'
                                                            : 'bg-primary'
                                                            }`}
                                                        style={{ width: `${Math.min((sharedCollectionsCount / PLAN_LIMITS.FREE.sharedCollections) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Free accounts can share up to 3 collections. Upgrade to Pro for unlimited.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">
                                                        {sharedCollectionsCount} shared {sharedCollectionsCount === 1 ? 'collection' : 'collections'}
                                                    </span>
                                                    <Badge variant="default">Unlimited</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    Pro users can share unlimited collections with other Corpus users.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-border">
                                    <h4 className="text-sm font-medium mb-2">Sharing Permissions</h4>
                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        <p>• <strong>Viewer:</strong> Can view entries in the collection</p>
                                        <p>• <strong>Contributor:</strong> Can add and remove entries</p>
                                        <p>• <strong>Admin:</strong> Can manage members and settings (Pro only)</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Plan Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Plan Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-medium mb-2">Current Plan Benefits</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Entry Limit</span>
                                    <span className="font-medium">
                                        {userPlan === 'FREE' ? '100 entries' : 'Unlimited'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span>Collections</span>
                                    <span className="font-medium">
                                        {userPlan === 'FREE' ? 'Available' : 'Available'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span>Shared Collections</span>
                                    <span className="font-medium">
                                        {userPlan === 'FREE' ? 'Up to 3' : 'Unlimited'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span>Knowledge Graph</span>
                                    <span className="font-medium">
                                        {userPlan === 'FREE' ? 'Not available' : 'Available'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {userPlan === 'FREE' && (
                            <div>
                                <h4 className="font-medium mb-2">Upgrade to Pro</h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Get unlimited entries, collections, shared collections, and the knowledge graph visualization.
                                </p>
                                <Button>
                                    <a href="/pricing">Upgrade to Pro</a>
                                </Button>
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
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : 'bg-red-50 text-red-800 border border-red-200'
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

function getPlanBadgeVariant(plan: string): "default" | "secondary" | "destructive" | "outline" {
    switch (plan) {
        case 'LIFETIME_PRO':
            return 'default';
        case 'PRO':
            return 'default';
        case 'FREE':
            return 'secondary';
        default:
            return 'secondary';
    }
}

function getPlanDisplay(plan: string): string {
    switch (plan) {
        case 'LIFETIME_PRO':
            return 'Lifetime Premium';
        case 'PRO':
            return 'Pro';
        case 'FREE':
            return 'Free';
        default:
            return 'Unknown';
    }
}
