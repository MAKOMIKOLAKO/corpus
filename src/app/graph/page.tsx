import type { Metadata } from "next";
import GraphPageClient from "./GraphPageClient";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ServerGraphPage() {
  return <GraphPageClient />;
}
