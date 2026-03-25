import type { Metadata } from "next";
import LandingPage from "./LandingPageClient";

export const metadata: Metadata = {
  title: 'Corpus — Personal Knowledge Indexing for Researchers',
  description: 'Corpus indexes everything you read and automatically extracts keywords, topics, and connections. Built for researchers, academics, and students who take their reading seriously.',
};

export default function ServerLandingPage() {
  return <LandingPage />;
}
