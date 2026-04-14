import type { Metadata } from "next";
import PricingPageClient from "./PricingPageClient";

export const revalidate = 86400; // Revalidate every day (pricing changes infrequently)

export const metadata: Metadata = {
  title: 'Pricing | Corpus',
  description: 'Choose the plan that fits your needs. Start free and upgrade as you grow.',
  alternates: {
    canonical: 'https://usecorpus.app/pricing',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
