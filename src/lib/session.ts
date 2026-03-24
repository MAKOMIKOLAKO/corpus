import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  console.log("Session:", session);
  console.log("User ID:", (session?.user as any)?.id);
  return (session?.user as any)?.id ?? null;
}
