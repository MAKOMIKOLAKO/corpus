import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";

export const revalidate = 3600; // Revalidate every hour

export const metadata: Metadata = {
  title: 'Corpus — Collaborative Research Platform for Academics',
  description: 'Corpus automatically tracks new research papers from your favorite journals. Get a daily feed with summaries so you never miss important research in your field.',
  alternates: {
    canonical: 'https://usecorpus.app',
  },
};

export default function LandingPage() {
  return <LandingPageClient />;
}
