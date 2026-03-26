'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleGetStarted = () => {
    router.push('/login');
  };

  const handleUpgrade = async (cycle?: string) => {
    if (!session) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billingCycle: cycle || billingCycle }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setLoading(false);
    }
  };

  const monthlyPrice = 6;
  const annualPrice = 30;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. Start free and upgrade as you grow.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <Card className="relative min-h-[600px] flex flex-col">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl">Free</CardTitle>
              <div className="text-4xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 flex flex-col">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Up to 100 entries</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>All content types (articles, papers, books, etc.)</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Chrome extension</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Keywords and topic extraction</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Full search and filtering</span>
                </li>
              </ul>
              <div className="mt-auto">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGetStarted}
                >
                  Get Started
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className="relative border-primary shadow-lg min-h-[600px] flex flex-col">
            {billingCycle === 'annual' && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <Badge className="bg-green-100 text-green-800 border-green-200 shadow-sm">
                  Save $6/month
                </Badge>
              </div>
            )}
            <CardHeader className="text-center pb-8 pt-6">
              <CardTitle className="text-2xl">Pro</CardTitle>
              <div className="space-y-2">
                {billingCycle === 'monthly' ? (
                  <div className="text-4xl font-bold">${monthlyPrice}<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                ) : (
                  <div>
                    <div className="text-4xl font-bold">${(annualPrice / 12).toFixed(2)}<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                    <div className="text-sm text-muted-foreground">${annualPrice} billed annually</div>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === 'annual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBillingCycle('annual')}
                >
                  Annual
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 flex flex-col">
              <div className="border-t pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-4">Everything in Free, plus:</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Unlimited entries</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Collections</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Knowledge graph</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
              <div className="mt-auto">
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade(billingCycle)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : billingCycle === 'monthly' ? (
                    'Start Pro Monthly'
                  ) : (
                    'Start Pro Annual'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="text-center mt-16 text-muted-foreground">
          <p>All plans include core features and secure data storage.</p>
          <p className="text-sm mt-2">Cancel anytime. No questions asked.</p>
        </div>
      </div>
    </div>
  );
}
