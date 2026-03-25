"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

const accent = "text-[var(--accent)]";
const accentBg = "bg-[var(--accent)]";

function IconChrome() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden aria-label="Save research papers and articles with one click">
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22V12M3 7l9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg className={`h-7 w-7 ${accent} corpus-glow`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden aria-label="AI-powered automatic keyword extraction and topic tagging">
      <path d="M12 3v3M12 18v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M3 12h3M18 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconGraph() {
  return (
    <svg className={`h-7 w-7 ${accent} corpus-glow`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden aria-label="Semantic knowledge graph connecting research papers and articles">
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8 16.5L16 7.5M16.5 16L18 8" strokeLinecap="round" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden aria-label="Research collections and reading lists">
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" strokeLinejoin="round" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden aria-label="Save papers by DOI, articles by URL, books by ISBN">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className={`h-7 w-7 ${accent}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden aria-label="Personal knowledge base that scales with your research">
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
    q: "How do I organize my research papers and articles?",
    a: "Corpus lets you save any research paper by DOI, article by URL, or book by ISBN. It automatically extracts keywords and topic tags so everything is organized the moment you save it — no manual categorization required.",
  },
  {
    q: "Is Corpus a good Zotero or Mendeley alternative?",
    a: "Corpus takes a different approach to reference management. Instead of storing full PDFs, it indexes structured metadata and lets you search across everything you've read instantly. It's built for speed and retrieval, not document storage.",
  },
  {
    q: "Can I use Corpus to build a personal knowledge base?",
    a: "Yes — Corpus is designed exactly for this. Save articles, papers, books, and essays over time and use the knowledge graph to discover connections between ideas across your entire reading history.",
  },
  {
    q: "Does Corpus work as a read-it-later app?",
    a: "Corpus complements read-it-later tools like Pocket or Instapaper. Use those to queue things to read, then save to Corpus once you've read something and want to remember and retrieve it later.",
  },
  {
    q: "How does Corpus compare to Notion for research organization?",
    a: "Notion is a general purpose workspace. Corpus is purpose-built for indexing what you read — with automatic metadata fetching, AI keyword extraction, and a semantic knowledge graph that Notion can't match for research workflows.",
  },
  {
    q: "Can I save research papers with a DOI to Corpus?",
    a: "Yes. Paste any DOI and Corpus fetches the full citation metadata automatically from CrossRef — title, authors, journal, year, and abstract — with no manual entry required.",
  },
  {
    q: "Is there a browser extension for saving articles to Corpus?",
    a: "Yes — the Corpus Web Clipper is available on the Chrome Web Store. Click the extension icon on any webpage to save it to your library instantly with automatic metadata capture.",
  },
  {
    q: "What is a personal knowledge management system?",
    a: "A personal knowledge management (PKM) system is a tool for capturing, organizing, and retrieving information you've encountered. Corpus is a PKM system focused specifically on written works — papers, articles, books, and essays — with AI-powered organization built in.",
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased selection:bg-[var(--accent)]/30 selection:text-[var(--foreground)] neural-bg">
      {/* Nav */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${navScrolled ? "border-[var(--border)] bg-[var(--background)]/75 backdrop-blur-md" : "border-transparent bg-transparent"
          }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight font-serif text-[var(--foreground)]">
            Corpus
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            <a href="#features" className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
              Features
            </a>
            <a href="#pricing" className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
              FAQ
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
              Sign In
            </Link>
            <Link
              href="/login"
              className={`rounded-lg px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] ${accentBg} shadow-sm corpus-glow transition hover:opacity-90`}
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
          <div className="border-t border-[var(--border)] bg-[var(--card)]/95 px-4 py-4 backdrop-blur-md md:hidden">
            <div className="flex flex-col gap-3 text-sm">
              <a href="#features" className="py-2 text-[var(--muted-foreground)]" onClick={() => setMobileOpen(false)}>
                Features
              </a>
              <a href="#pricing" className="py-2 text-[var(--muted-foreground)]" onClick={() => setMobileOpen(false)}>
                Pricing
              </a>
              <a href="#faq" className="py-2 text-[var(--muted-foreground)]" onClick={() => setMobileOpen(false)}>
                FAQ
              </a>
              <Link href="/login" className="py-2 font-medium text-[var(--foreground)]" onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
              <Link href="/login" className={`rounded-lg py-3 text-center font-medium text-[var(--accent-foreground)] ${accentBg}`} onClick={() => setMobileOpen(false)}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.08),transparent)]" />
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
              className="absolute h-1 w-1 animate-neuralFloat rounded-full bg-[var(--accent)]/20"
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
            <h1 className="text-4xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              The architecture of insight.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted-foreground)]">
              Corpus is the living library that connects what you read. Beyond storage toward discovery—your personal corpus, instantly discoverable.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/login"
                className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] ${accentBg} shadow-lg corpus-glow transition hover:opacity-90`}
              >
                Build Your Knowledge Base
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
              >
                Connect the Dots
              </a>
            </div>
          </div>

          <div data-reveal className={`${reveal} delay-100`}>
            <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card)]/50 p-5 shadow-2xl backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-[var(--border)] pb-4">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--muted-foreground)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--muted-foreground)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--muted-foreground)]" />
                </div>
                <span className="ml-2 text-xs text-[var(--muted-foreground)]">library</span>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/80 p-4 discovery-reveal">
                  <p className="text-sm font-medium text-[var(--foreground)]">Attention Is All You Need</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Vaswani et al. · 2017 · Paper</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["transformer", "NLP", "self-attention"].map((k) => (
                      <span key={k} className="rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)] corpus-glow">
                        {k}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">ML</span>
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">deep learning</span>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-4 opacity-80">
                  <p className="text-sm font-medium text-[var(--foreground)]">The Structure of Scientific Revolutions</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Thomas Kuhn · Book</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["paradigm", "history of science"].map((k) => (
                      <span key={k} className="rounded-md border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]/90">
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
            <h2 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">Everything your research workflow needs</h2>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                data-reveal
                className={`${reveal} group rounded-2xl border-[var(--border)] bg-[var(--card)]/30 p-8 transition-transform duration-300 hover:-translate-y-1 hover:border-[var(--accent)]`}
              >
                <div className="mb-5">{f.icon}</div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--border)] bg-[var(--background)] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal className={`${reveal} mx-auto max-w-2xl text-center`}>
            <h2 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">Save and organize research papers, articles, and books in seconds</h2>
          </div>

          <div className="relative mt-20 grid gap-12 lg:grid-cols-3 lg:gap-8">
            <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent lg:block" aria-hidden />
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
                  <span className="text-5xl font-bold tabular-nums text-[var(--muted-foreground)]">{step.n}</span>
                </div>
                <div className="mb-4 flex justify-center lg:justify-start">{step.icon}</div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4">
          <div data-reveal className={`${reveal} mx-auto max-w-2xl text-center`}>
            <h2 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-[var(--muted-foreground)]">Start free, upgrade when you need more power</p>
          </div>

          <div data-reveal className={`${reveal} mt-16 grid gap-8 lg:grid-cols-2`}>
            {/* Free Plan */}
            <div className="relative flex flex-col rounded-2xl border-[var(--border)] bg-[var(--card)] p-8">
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-[var(--foreground)]">Free</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-[var(--foreground)]">$0</span>
                  <span className="text-[var(--muted-foreground)]">/month</span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Perfect for getting started</p>
              </div>

              <ul className="mb-8 space-y-4">
                {[
                  "Up to 100 entries",
                  "All content types supported",
                  "AI-powered keyword extraction",
                  "Full search and filtering",
                  "Chrome extension included"
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]/20">
                      <svg className="h-3 w-3 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-[var(--foreground)]">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/login"
                  className="block w-full rounded-lg border-[var(--border)] bg-[var(--background)] py-3 text-center font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
                >
                  Get Started Free
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="relative flex flex-col rounded-2xl border-2 border-[var(--accent)] bg-[var(--card)] p-8 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-4 py-1 text-xs font-semibold text-[var(--accent-foreground)]">
                Most Popular
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-[var(--foreground)]">Pro</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-[var(--foreground)]">
                    {billing === "monthly" ? "$6" : "$4"}
                  </span>
                  <span className="text-[var(--muted-foreground)]">/month</span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {billing === "monthly" ? "Billed monthly" : "Billed annually (save 33%)"}
                </p>
              </div>

              <ul className="mb-8 space-y-4">
                {[
                  "Unlimited entries",
                  "Everything in Free",
                  "Collections & organization",
                  "Knowledge graph visualization",
                  "Priority support",
                  "Advanced AI features"
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]/20">
                      <svg className="h-3 w-3 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-[var(--foreground)]">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href="/pricing"
                  className={`block w-full rounded-lg bg-[var(--accent)] py-3 text-center font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent)]/90 corpus-glow`}
                >
                  Start Pro Trial
                </Link>
              </div>
            </div>
          </div>

          <div data-reveal className={`${reveal} mt-8 flex justify-center gap-4 text-sm text-[var(--muted-foreground)]`}>
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-4 py-2 font-medium transition ${billing === "monthly" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:text-[var(--foreground)]"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`rounded-full px-4 py-2 font-medium transition ${billing === "annual" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "hover:text-[var(--foreground)]"}`}
            >
              Annual
              <span className="ml-2 rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-xs text-[var(--accent)]">Save 33%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-[var(--border)] bg-[var(--background)] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal className={`${reveal} mx-auto max-w-2xl text-center`}>
            <h2 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">Trusted by researchers, academics, and students</h2>
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
                className={`${reveal} relative rounded-2xl border-[var(--border)] bg-[var(--card)]/50 p-8`}
              >
                <span className="absolute left-6 top-4 font-serif text-5xl leading-none text-[var(--accent)]/40">&ldquo;</span>
                <p className="relative z-10 pt-6 text-sm leading-relaxed text-[var(--muted-foreground)]">{t.quote}</p>
                <footer className="mt-6 text-xs text-[var(--muted-foreground)]">— {t.role}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4">
          <div data-reveal className={`${reveal} text-center`}>
            <h2 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">Frequently asked questions about Corpus</h2>
          </div>
          <div className="mt-12 space-y-2">
            {faqItems.map((item, i) => (
              <div key={item.q} data-reveal className={`${reveal} overflow-hidden rounded-xl border-[var(--border)] bg-[var(--card)]/30`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]/50"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {item.q}
                  <span className="text-[var(--muted-foreground)]">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <div className="border-t border-[var(--border)] px-5 py-4 text-sm leading-relaxed text-[var(--muted-foreground)]">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section data-reveal className={`${reveal} border-t border-[var(--border)] bg-[var(--background)] py-24`}>
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">Start building your personal knowledge base today</h2>
          <p className="mt-4 text-[var(--muted-foreground)]">Free forever. No credit card required.</p>
          <Link
            href="/login"
            className={`mt-10 inline-flex min-w-[200px] justify-center rounded-lg px-8 py-4 text-base font-semibold text-white ${accentBg} shadow-xl shadow-indigo-500/30 transition hover:bg-indigo-400`}
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Hidden SEO paragraph */}
      <p className="sr-only">
        Corpus is a personal knowledge management tool and research paper organizer built for academics, researchers, and students. Save research papers by DOI, web articles by URL, and books by ISBN. Automatically extract keywords and topics with AI. Build a semantic knowledge graph of your reading history. Use as a Zotero alternative, Mendeley alternative, or Readwise alternative for organizing your academic reading list. Available as a Chrome extension for one-click saving from any webpage. Free personal knowledge base software with a Pro plan for unlimited entries and advanced features.
      </p>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--background)] py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <span className="text-lg font-semibold text-[var(--foreground)]">Corpus</span>
            <p className="text-xs text-[var(--muted-foreground)]">© {new Date().getFullYear()} Corpus. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-sm text-[var(--muted-foreground)]">
            <Link href="/privacy" className="transition hover:text-[var(--foreground)]">
              Privacy
            </Link>
            <Link href="/pricing" className="transition hover:text-[var(--foreground)]">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
