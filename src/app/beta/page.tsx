import { getServerSession } from "next-auth";
import Link from "next/link";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:py-16">
      <Badge variant="secondary" className="w-fit">Limited Access</Badge>
      <div className="space-y-4">
        <h1 className="text-3xl font-medium tracking-tight text-content-primary sm:text-4xl">Corpus Beta</h1>
        <p className="max-w-2xl text-lg leading-7 text-content-secondary">
          A research knowledge platform that helps you discover, organize, and understand academic work—powered by AI.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-medium text-content-primary">What Corpus does</h2>
        <div className="space-y-4 text-base leading-7 text-content-secondary">
          <p>
            Corpus is designed for researchers, students, and anyone who needs to stay on top of academic literature. It
            combines intelligent discovery with powerful organization tools to make research workflows faster and more
            effective.
          </p>
          <ul className="ml-4 space-y-2 list-disc">
            <li><strong className="text-content-primary">Smart Discovery</strong> — Get daily paper recommendations tailored to your research interests using AI-powered semantic matching</li>
            <li><strong className="text-content-primary">Organized Library</strong> — Save papers, books, and articles into collections with custom tags and notes</li>
            <li><strong className="text-content-primary">AI Summaries</strong> — Automatically generated summaries help you quickly grasp key insights</li>
            <li><strong className="text-content-primary">Research Profiles</strong> — Connect with other researchers and share your reading lists</li>
            <li><strong className="text-content-primary">Daily Briefs</strong> — Curated daily updates on emerging research in your field</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-medium text-content-primary">How it works</h2>
        <p className="max-w-2xl text-base leading-7 text-content-secondary">
          Start by building your library—add papers manually or let Corpus suggest relevant work based on what you save.
          Your research profile learns from your interests, improving recommendations over time. Set up smart alerts to
          automatically notify you when new papers match your queries.
        </p>
      </div>

      <div className="space-y-4">
        <p className="max-w-2xl text-base leading-7 text-content-secondary">
          Thanks for joining early. A welcome note is open now with details on how to share feedback and shape what we
          build next.
        </p>
        <Link
          href={userId ? "/library" : "/login?callbackUrl=%2Fbeta"}
          className="group/button inline-flex h-14 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent bg-accent bg-clip-padding px-6 text-base font-medium text-accent-foreground outline-none transition-all select-none hover:bg-accent/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:min-w-[280px]"
        >
          {userId ? "Go to your library" : "Sign Up / Sign In"}
        </Link>
        {!userId && (
          <p className="rounded-lg border border-border-cream bg-ivory px-4 py-3 text-sm text-content-secondary">
            Sign in to have the <span className="font-medium text-content-primary">Beta Tester</span> tag applied to your
            profile.
          </p>
        )}
      </div>

      <BetaWelcomeModal />
    </main>
  );
}
