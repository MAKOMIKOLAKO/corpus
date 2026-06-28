'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-medium tracking-tight mb-4">
            Free while we&apos;re in beta.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            All features are available to everyone right now. No credit card required.
          </p>
        </div>

        <div className="max-w-sm mx-auto rounded-[16px] border border-border bg-card p-8 shadow-sm">
          <ul className="space-y-4 mb-8">
            {[
              'Unlimited entries',
              'Unlimited collections',
              'DOI and URL metadata lookup',
              'Reading status tracking',
              'Free forever during beta',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check className="w-5 h-5 text-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button className="w-full" onClick={() => router.push('/login')}>
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
}
