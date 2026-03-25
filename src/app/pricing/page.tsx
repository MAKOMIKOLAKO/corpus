import type { Metadata } from "next";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Start free with 100 entries. Upgrade to Pro for unlimited entries, collections, and the knowledge graph. $6/month or $48/year.',
};

export default function ServerPricingPage() {
  return <PricingPageClient />;
}
