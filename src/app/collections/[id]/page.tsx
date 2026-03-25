import type { Metadata } from "next";
import CollectionDetailPageClient from "./CollectionDetailPageClient";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ServerCollectionDetailPage() {
  return <CollectionDetailPageClient />;
}
