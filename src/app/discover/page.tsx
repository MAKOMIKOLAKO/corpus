import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import DiscoverPageClient from "./DiscoverPageClient";

export const metadata: Metadata = {
  title: "Discover — Corpus",
  description: "Discover recommended papers for your library.",
};

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  return <DiscoverPageClient />;
}
