import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id ?? null;
}
