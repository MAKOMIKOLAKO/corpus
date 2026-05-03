import { Loader2, Sparkles } from 'lucide-react'

export default function WorkspaceNewLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-border-cream bg-ivory p-8 text-center ring-shadow-warm sm:p-12">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta/10 text-terracotta ring-shadow-warm">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <h1 className="font-serif text-[2rem] font-medium leading-[1.15] text-content-primary sm:text-[2.4rem]">
              Preparing your workspace
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-content-secondary sm:text-base">
              We&apos;re creating your reading session, gathering the paper, and loading the workspace in a protected flow so duplicate opens don&apos;t stack up.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-content-secondary">
            <Loader2 className="h-5 w-5 animate-spin text-terracotta" />
            Opening paper workspace…
          </div>
        </div>
      </div>
    </div>
  )
}
