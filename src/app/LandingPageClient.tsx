"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

const accent = "text-indigo-500";
const accentBg = "bg-indigo-500";

function IconChrome() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22V12M3 7l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconGraph() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8 16.5L16 7.5M16.5 16L18 8" strokeLinecap="round" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" strokeLinejoin="round" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" strokeLinejoin="round" />
      <path d="M17 21v-8H7v8M7 3v5h8" strokeLinejoin="round" />
    </svg>
  );
}

function IconOrganize() {
  return (
    <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" strokeLinecap="round" />
    </svg>
  );
}

const features = [
  {
    icon: <IconChrome />,
    title: "One-Click Saving",
    body: "Save any article, paper, or webpage instantly with the Corpus Chrome extension. No copying, no pasting, no friction.",
  },
  {
    icon: <IconSpark />,
    title: "AI-Powered Organization",
    body: "Corpus automatically extracts keywords and assigns topic tags to everything you save. Your library organizes itself.",
  },
  {
    icon: <IconGraph />,
    title: "Knowledge Graph",
    body: "Visualize connections between your entries as an interactive graph. Discover relationships between ideas you never noticed.",
  },
  {
    icon: <IconFolder />,
    title: "Collections",
    body: "Group entries around projects, papers, or themes. Build focused reading lists for any research goal.",
  },
  {
    icon: <IconLayers />,
    title: "Every Format",
    body: "Papers via DOI, articles via URL, books via ISBN. Corpus fetches full metadata automatically for all of them.",
  },
  {
    icon: <IconShield />,
    title: "Built to Last",
    body: "Your library grows with you. Corpus is designed to hold thousands of entries and retrieve any of them instantly.",
  },
];

const faqItems = [
  {
    q: "Is Corpus free to use?",
    a: "Yes — Corpus has a generous free tier with up to 100 entries and all core features. Upgrade to Pro for unlimited entries, collections, and the knowledge graph.",
  },
  {
    q: "Does Corpus store my full documents?",
    a: "No. Corpus is metadata-first — it stores structured information about what you've read, not the content itself. Think of it as a smart index, not a document archive.",
  },
  {
    q: "How does the Chrome extension work?",
    a: "Install the Corpus Web Clipper from the Chrome Web Store. Click the icon on any webpage, confirm the details, and it's saved to your library instantly.",
  },
  {
    q: "What types of content can I save?",
    a: "Articles, blog posts, research papers (via DOI), books (via ISBN), essays, policy reports, and more. Corpus fetches metadata automatically for all of them.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. Cancel anytime from your account settings. You'll keep Pro access until the end of your billing period.",
  },
  {
    q: "Is my data private?",
    a: "Your library is completely private. Only you can see your entries, collections, and reading history.",
  },
];

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("opacity-100", "translate-y-0");
          entry.target.classList.remove("opacity-0", "translate-y-8");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -48px 0px" }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const reveal = "opacity-0 translate-y-8 transition-all duration-700 ease-out";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Nav */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
          navScrolled ? "border-white/[0.06] bg-[#0a0a0a]/75 backdrop-blur-md" : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            Corpus
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            <a href="#features" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Features
            </a>
            <a href="#pricing" className="text-sm text-zinc-400 transition-colors hover:text-white">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-zinc-400 transition-colors hover:text-white">
              FAQ
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm font-medium text-zinc-300 transition-colors hover:text-white">
              Sign In
            </Link>
            <Link
              href="/login"
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${accentBg} shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-400`}
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-300 md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-white/[0.06] bg-[#0a0a0a]/95 px-4 py-4 backdrop-blur-md md:hidden">
            <div className="flex flex-col gap-3 text-sm">
              <a href="#features" className="py-2 text-zinc-300" onClick={() => setMobileOpen(false)}>
                Features
              </a>
              <a href="#pricing" className="py-2 text-zinc-300" onClick={() => setMobileOpen(false)}>
                Pricing
              </a>
              <a href="#faq" className="py-2 text-zinc-300" onClick={() => setMobileOpen(false)}>
                FAQ
              </a>
              <Link href="/login" className="py-2 font-medium text-white" onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
              <Link href="/login" className={`rounded-lg py-3 text-center font-medium text-white ${accentBg}`} onClick={() => setMobileOpen(false)}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
          style={{ backgroundImage: GRAIN_BG }}
          aria-hidden
        />
        {/* Slow particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 animate-corpusFloat rounded-full bg-indigo-400/25"
              style={{
                left: `${(i * 41) % 100}%`,
                top: `${(i * 67) % 100}%`,
                animationDuration: `${20 + (i % 8)}s`,
                animationDelay: `${i * 0.35}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto grid max-w-6xl gap-16 px-4 pb-24 pt-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:pt-8">
          <div data-reveal className={reveal}>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Your research, finally organized.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
              Corpus indexes everything you read — papers, articles, books, essays — and automatically extracts the ideas that matter. Built for researchers, academics, and students who take their reading seriously.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/login"
                className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white ${accentBg} shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400`}
              >
                Get Started Free
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.06]"
              >
                See how it works
              </a>
            </div>
          </div>

          <div data-reveal className={`${reveal} delay-100`}>
            <div className="relative rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-5 shadow-2xl shadow-black/50 backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-white/[0.06] pb-4">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
                </div>
                <span className="ml-2 text-xs text-zinc-500">library</span>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a]/80 p-4">
                  <p className="text-sm font-medium text-zinc-200">Attention Is All You Need</p>
                  <p className="mt-1 text-xs text-zinc-500">Vaswani et al. · 2017 · Paper</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["transformer", "NLP", "self-attention"].map((k) => (
                      <span key={k} className="rounded-md border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                        {k}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">ML</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-500">deep learning</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0a]/60 p-4 opacity-80">
                  <p className="text-sm font-medium text-zinc-300">The Structure of Scientific Revolutions</p>
                  <p className="mt-1 text-xs text-zinc-500">Thomas Kuhn · Book</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["paradigm", "history of science"].map((k) => (
                      <span key={k} className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 text-[10px] text-indigo-200/90">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal className={`${reveal} mx-auto max-w-2xl text-center`}>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything your reading workflow needs</h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                data-reveal
                className={`${reveal} group rounded-2xl border border-white/[0.08] bg-zinc-900/30 p-8 transition-transform duration-300 hover:-translate-y-1 hover:border-white/[0.12]`}
              >
                <div className="mb-5">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/[0.06] bg-[#080808] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal className={`${reveal} mx-auto max-w-2xl text-center`}>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">From reading to organized in seconds</h2>
          </div>

          <div className="relative mt-20 grid gap-12 lg:grid-cols-3 lg:gap-8">
            <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent lg:block" aria-hidden />
            {[
              {
                n: "01",
                icon: <IconSave />,
                title: "Save",
                desc: "Paste a DOI, URL, or ISBN. Or use the Chrome extension on any page.",
              },
              {
                n: "02",
                icon: <IconOrganize />,
                title: "Organize",
                desc: "Corpus extracts keywords and topics automatically. Edit anything.",
              },
              {
                n: "03",
                icon: <IconSearch />,
                title: "Retrieve",
                desc: "Search, filter, browse by topic, or explore the knowledge graph.",
              },
            ].map((step) => (
              <div key={step.n} data-reveal className={`${reveal} relative text-center lg:text-left`}>
                <div className="mb-6 flex justify-center lg:justify-start">
                  <span className="text-5xl font-bold tabular-nums text-zinc-800">{step.n}</span>
                </div>
                <div className="mb-4 flex justify-center lg:justify-start">{step.icon}</div>
                <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal className={`${reveal} mx-auto max-w-2xl text-center`}>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Simple, honest pricing</h2>
            <p className="mt-4 text-zinc-400">Start free. Upgrade when you&apos;re ready.</p>
          </div>

          <div data-reveal className={`${reveal} mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row`}>
            <span className="text-sm text-zinc-500">Billing</span>
            <div className="inline-flex rounded-full border border-white/10 bg-zinc-900/50 p-1">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${billing === "monthly" ? `${accentBg} text-white` : "text-zinc-400 hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling("annual")}
                className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition ${billing === "annual" ? `${accentBg} text-white` : "text-zinc-400 hover:text-white"}`}
              >
                Annual
                <span className="absolute -right-1 -top-2 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-200">2 months free</span>
              </button>
            </div>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2 lg:items-stretch">
            <div data-reveal className={`${reveal} flex flex-col rounded-2xl border border-white/[0.08] bg-zinc-900/25 p-8`}>
              <h3 className="text-lg font-semibold text-white">Free</h3>
              <p className="mt-4">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-zinc-500">/month</span>
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {[
                  { ok: true, t: "Up to 100 entries" },
                  { ok: true, t: "All content types" },
                  { ok: true, t: "AI keyword extraction" },
                  { ok: true, t: "Full search and filtering" },
                  { ok: true, t: "Chrome extension" },
                  { ok: false, t: "Collections" },
                  { ok: false, t: "Knowledge graph" },
                ].map((item) => (
                  <li key={item.t} className={`flex items-start gap-2 ${!item.ok ? "text-zinc-600" : "text-zinc-300"}`}>
                    <span className={item.ok ? "text-indigo-400" : "text-zinc-600"}>{item.ok ? "✓" : "✗"}</span>
                    {item.t}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="mt-10 inline-flex justify-center rounded-lg border border-white/15 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.05]"
              >
                Get Started Free
              </Link>
            </div>

            <div
              data-reveal
              className={`${reveal} relative flex flex-col rounded-2xl border-2 border-indigo-500/50 bg-zinc-900/40 p-8 shadow-xl shadow-indigo-500/10 lg:scale-[1.02]`}
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-indigo-400/40 bg-indigo-500/90 px-3 py-1 text-xs font-semibold text-white shadow-lg">Most popular</span>
              <h3 className="text-lg font-semibold text-white">Pro</h3>
              <p className="mt-4">
                {billing === "monthly" ? (
                  <>
                    <span className="text-4xl font-bold text-white">$6</span>
                    <span className="text-zinc-500">/month</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-white">$4</span>
                    <span className="text-zinc-500">/month</span>
                    <span className="mt-2 block text-sm text-zinc-500">billed annually</span>
                  </>
                )}
              </p>
              <ul className="mt-8 flex-1 space-y-3 text-sm text-zinc-300">
                {["Unlimited entries", "Everything in Free", "Collections", "Knowledge graph", "Priority support"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="text-indigo-400">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className={`mt-10 inline-flex justify-center rounded-lg py-3 text-sm font-semibold text-white ${accentBg} shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400`}
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-white/[0.06] bg-[#080808] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal className={`${reveal} mx-auto max-w-2xl text-center`}>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">What researchers are saying</h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                quote: "Corpus replaced my chaotic folder of bookmarks and PDFs. I can actually find things now.",
                role: "PhD Student, Computer Science",
              },
              {
                quote: "The knowledge graph alone is worth it. I discovered connections between papers I'd saved months apart.",
                role: "Research Associate, Cognitive Science",
              },
              {
                quote: "I save everything with the Chrome extension now. The AI tagging means I never have to categorize anything manually.",
                role: "Undergraduate Researcher, Biology",
              },
            ].map((t) => (
              <blockquote
                key={t.role}
                data-reveal
                className={`${reveal} relative rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-8`}
              >
                <span className="absolute left-6 top-4 font-serif text-5xl leading-none text-indigo-500/40">&ldquo;</span>
                <p className="relative z-10 pt-6 text-sm leading-relaxed text-zinc-300">{t.quote}</p>
                <footer className="mt-6 text-xs text-zinc-500">— {t.role}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4">
          <div data-reveal className={`${reveal} text-center`}>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Frequently asked questions</h2>
          </div>
          <div className="mt-12 space-y-2">
            {faqItems.map((item, i) => (
              <div key={item.q} data-reveal className={`${reveal} overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900/30`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-white transition hover:bg-white/[0.03]"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {item.q}
                  <span className="text-zinc-500">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <div className="border-t border-white/[0.06] px-5 py-4 text-sm leading-relaxed text-zinc-400">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section data-reveal className={`${reveal} border-t border-indigo-500/20 bg-indigo-950/40 py-24`}>
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Start building your knowledge library today.</h2>
          <p className="mt-4 text-zinc-400">Free forever. No credit card required.</p>
          <Link
            href="/login"
            className={`mt-10 inline-flex min-w-[200px] justify-center rounded-lg px-8 py-4 text-base font-semibold text-white ${accentBg} shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400`}
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#050505] py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <span className="text-lg font-semibold text-white">Corpus</span>
            <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Corpus. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm text-zinc-500">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/pricing" className="transition hover:text-white">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
