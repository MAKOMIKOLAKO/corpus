import type { Metadata } from "next";
import DiscoverPageClient from "./DiscoverPageClient";

export const metadata: Metadata = {
  title: "Discover — Corpus",
  description: "Discover recommended papers for your library.",
};

export default function DiscoverPage() {
  return <DiscoverPageClient />;
}
