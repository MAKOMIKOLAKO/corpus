import type { Metadata } from "next";
import PricingPageClient from "./PricingPageClient";

export const revalidate = 86400; // Revalidate every day (pricing changes infrequently)

export const metadata: Metadata = {
  title: 'Pricing | Corpus',
  description: 'Corpus is free while in beta. All features are available to everyone — no credit card required.',
  alternates: {
    canonical: 'https://www.usecorpus.app/pricing',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
