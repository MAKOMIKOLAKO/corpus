import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import BetaWelcomeModal from "@/components/BetaWelcomeModal";
import { Badge } from "@/components/ui/badge";

export default async function BetaPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (userId) {
    try {
      await prisma.user.updateMany({
        where: {
          id: userId,
          isBetaTester: false,
        },
        data: {
          isBetaTester: true,
        },
      } as any);
    } catch (error: any) {
      if (error?.code !== "P2022") {
        throw error;
      }
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:py-16">
      <Badge variant="secondary" className="w-fit">Limited Access</Badge>
      <h1 className="text-3xl font-medium tracking-tight text-content-primary sm:text-4xl">Corpus Beta</h1>
      <p className="max-w-2xl text-base leading-7 text-content-secondary">
        Thanks for joining early. A welcome note is open now with details on how to share feedback and shape what we
        build next.
      </p>
      {!userId && (
        <p className="rounded-lg border border-border-cream bg-ivory px-4 py-3 text-sm text-content-secondary">
          Sign in to have the <span className="font-medium text-content-primary">Beta Tester</span> tag applied to your
          profile.
        </p>
      )}
      <BetaWelcomeModal />
    </main>
  );
}
