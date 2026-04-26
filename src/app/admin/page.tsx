import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdminDashboardPageClient from "./AdminDashboardPageClient";
import { requireAdminSession } from "@/lib/adminAuth";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const session = await requireAdminSession();

  if (!session?.user?.id) {
    notFound();
  }

  console.log(`[ADMIN ACCESS] userId=${session.user.id} email=${session.user.email ?? 'unknown'} section=overview timestamp=${new Date().toISOString()}`);

  return (
    <AdminDashboardPageClient
      sessionUser={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }}
    />
  );
}
