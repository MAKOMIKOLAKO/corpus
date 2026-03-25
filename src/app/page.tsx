import type { Metadata } from "next";
import LandingPage from "./LandingPageClient";

export const metadata: Metadata = {
  title: 'Corpus — Personal Knowledge Indexing for Researchers',
  description: 'Build your personal knowledge base with Corpus. Save and organize research papers, articles, books, and essays with automatic AI tagging, full-text search, and a semantic knowledge graph. Free for researchers and students.',
};

export default function ServerLandingPage() {
  return <LandingPage />;
}
