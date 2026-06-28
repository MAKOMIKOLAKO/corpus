'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import FAQPageJsonLd from '@/components/FAQPageJsonLd';
import ProductJsonLd from '@/components/ProductJsonLd';

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

  const monthlyPrice = 7;
  const annualPrice = 60;

  return (
    <div className="min-h-screen bg-background">
      <FAQPageJsonLd
        faqs={[
          {
            question: "What's included in the free plan?",
            answer: "The free plan includes 50 saved entries, 1 personal collection, paper and book search, AI metadata extraction, and full text search."
          },
          {
            question: "What's the difference between monthly and annual billing?",
            answer: "Annual billing gives you 2 months free (pay for 10 months, get 12). Monthly billing is $7/month, while annual billing is $60/year."
          },
          {
            question: "Can I cancel my subscription anytime?",
            answer: "Yes, you can cancel your subscription anytime from your account settings. You'll continue to have access until the end of your billing period."
          }
        ]}
      />
      <ProductJsonLd
        name="Corpus Pro"
        description="Unlimited research papers, collections, and shared collections with priority queue processing."
        url="https://usecorpus.app/pricing"
        offers={[
          {
            price: "7",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock"
          },
          {
            price: "60",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock"
          }
        ]}
      />
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
              <div className="space-y-2">
                <div className="text-4xl font-bold">$0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 flex flex-col">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>50 saved entries</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>1 personal collection</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Join shared collections as viewer</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Paper and book search</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>AI metadata extraction</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Full text search</span>
                </li>
<li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>Research connections and labs</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">Unlimited entries (grayed out)</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">Unlimited collections (grayed out)</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">Create shared collections (grayed out)</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">Batch entry actions (grayed out)</span>
                </li>
                <li className="flex items-center gap-3">
                  <X className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">Priority queue processing (grayed out)</span>
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
            <CardHeader className="text-center pb-8">
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
                    <span>Unlimited saved entries</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Unlimited personal collections</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Create shared collections with role-based permissions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Contribute to shared collections</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Batch entry actions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Priority queue processing</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Early access to new features</span>
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
