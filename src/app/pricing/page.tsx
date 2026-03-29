import type { Metadata } from "next";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Start free with 50 saved entries, 1 personal collection, join shared collections as viewer, paper and book search, AI metadata extraction, full text search, Chrome extension, and research connections and labs. Upgrade to Pro for unlimited entries, collections, and shared collections, batch entry actions, and priority queue processing. $7/month or $60/year.',
};

export default function ServerPricingPage() {
  return <PricingPageClient />;
}
