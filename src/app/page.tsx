import type { Metadata } from "next";
import LandingPage from "./LandingPageClient";

export const metadata: Metadata = {
  title: 'Corpus — Automatic Research Updates from Your Sources',
  description: 'Corpus automatically tracks new research papers from your favorite journals and sources. Get a daily feed with summaries so you never miss important research in your field.',
};

export default function ServerLandingPage() {
  return <LandingPage />;
}
