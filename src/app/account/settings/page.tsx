'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Gift, Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { getUserPlan } from '@/lib/plans';

export default function AccountPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [promoCode, setPromoCode] = useState('');
    const [redeeming, setRedeeming] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);

    const userPlan = getUserPlan(session?.user || null);
    const upgraded = searchParams?.get('upgraded') === 'true';

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
                <h2 className="text-xl font-medium tracking-tight">account settings</h2>
                <p className="text-sm text-muted-foreground">manage your account and subscription.</p>
            </div>

            {/* Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Information</CardTitle>
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

            {/* Billing Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Billing
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
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

                        {userPlan === 'LIFETIME_PRO' && (
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
                                        {userPlan === 'FREE' ? 'Not available' : 'Available'}
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
                                    Get unlimited entries, collections, and the knowledge graph visualization.
                                </p>
                                <Button>
                                    <a href="/pricing">Upgrade to Pro</a>
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
