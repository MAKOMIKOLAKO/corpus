import type { Metadata } from "next";
import DiscoverFeedsClient from "./DiscoverFeedsClient";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DiscoverFeedsPage() {
  return <DiscoverFeedsClient />;
}
