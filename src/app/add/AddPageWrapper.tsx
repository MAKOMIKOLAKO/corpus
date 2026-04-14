import type { Metadata } from "next";
import AddPageClient from "./AddPageClient";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AddPageWrapper() {
  return <AddPageClient />;
}
