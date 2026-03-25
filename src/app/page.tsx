import type { Metadata } from "next";
import LandingPage from "./LandingPageClient";

export const metadata: Metadata = {
  title: 'Corpus — The Collaborative Research Platform for Academics',
  description: 'Corpus is the collaborative research platform for academics, researchers, and students. Save papers by DOI, share with your network, build lab reading lists, and discover connections with AI. Free to start.',
};

export default function ServerLandingPage() {
  return <LandingPage />;
}
