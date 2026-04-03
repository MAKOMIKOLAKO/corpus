"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SoftwareApplicationJsonLd from "@/components/SoftwareApplicationJsonLd";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    icon: <IconLayers />,
    title: "Save Any Research Source",
    body: "Add papers by DOI, preprints by URL, or books by ISBN. Corpus fetches full citation metadata automatically — title, authors, abstract, journal, and year — with no manual entry.",
  },
  {
    icon: <IconSpark />,
    title: "AI-Powered Organization",
    body: "Every source you save is automatically tagged with keywords and topic labels by AI. Your library organizes itself so you can focus on the research.",
  },
  {
    icon: <IconFolder />,
    title: "Collaborative Collections",
    body: "Build shared reading lists with your lab, study group, or research collaborators. Everyone contributes, everyone benefits.",
  },
  {
    icon: <IconShield />,
    title: "Research Connections",
    body: "Connect with other researchers on Corpus. Share papers directly with your network and discover what your connections are reading and saving.",
  },
  {
    icon: <IconGraph />,
    title: "Semantic Knowledge Graph",
    body: "Visualize deep connections between your sources using semantic AI. Discover relationships between papers you never knew were related.",
  },
  {
    icon: <IconChrome />,
    title: "Chrome Extension",
    body: "Save any paper or article from the web in one click with the Corpus Web Clipper. Works on journal websites, ArXiv, PubMed, and anywhere else you find research.",
  },
];

const faqItems = [
  {
    q: "How is Corpus different from Zotero or Mendeley?",
    a: "Zotero and Mendeley are powerful reference managers built around storing and citing PDFs. Corpus takes a different approach — it indexes the metadata and ideas from what you read, adds AI-powered organization, and layers a social network on top so you can share and discover research with your academic network.",
  },
  {
    q: "Can I save ArXiv preprints and PubMed papers?",
    a: "Yes. Any paper with a DOI can be saved via CrossRef metadata fetch. ArXiv preprints and other sources without DOIs can be saved via URL. Corpus captures whatever metadata is available automatically.",
  },
  {
    q: "How do research connections work?",
    a: "Connect with other Corpus users by searching their username or email. Once connected, you can share individual papers directly with them and they appear in their inbox to accept or decline. You can also build shared collections together.",
  },
  {
    q: "Does Corpus store my PDFs?",
    a: "No. Corpus is metadata-first — it stores structured information about your sources, not the files themselves. This keeps your library fast, lightweight, and legally clean.",
  },
  {
    q: "Can I use Corpus with my research lab or study group?",
    a: "Yes — shared collections are built for exactly this. Create a collection, invite your collaborators, and everyone can add papers and browse the shared library together.",
  },
  {
    q: "Is my library private?",
    a: "Your personal library is completely private. Only content you explicitly share with connections or add to shared collections is visible to others.",
  },
  {
    q: "Is there a browser extension?",
    a: "Yes — the Corpus Web Clipper is available on the Chrome Web Store. Click the icon on any page to save it to your library instantly.",
  },
  {
    q: "How much does Corpus cost?",
    a: "Corpus is free for up to 100 saved sources with full access to core features including the Chrome extension, AI organization, and research connections. Pro is $6/month or $30/month (billed annually) for unlimited sources, collaborative collections, and the knowledge graph.",
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
      <SoftwareApplicationJsonLd />
      {/* Nav */}
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${navScrolled ? "border-[var(--border)] bg-[var(--background)]/75 backdrop-blur-md" : "border-transparent bg-transparent"
          }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight font-serif text-[var(--foreground)] flex items-center gap-2">
            Corpus
            <span className="text-xs font-normal text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded-sm">
              beta
            </span>
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
            <ThemeToggle />
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
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-default text-content-secondary hover:bg-surface-raised md:hidden"
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
              <div className="py-1">
                <ThemeToggle />
              </div>
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
          className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.35] mix-blend-overlay"
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
            <h1 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Where research gets done together.
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[var(--muted-foreground)]">
              Corpus is the collaborative research platform for academics, researchers, and students. Save papers, discover connections, and build knowledge with your network — all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-4">
              <Link
                href="/login"
                className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] ${accentBg} shadow-lg corpus-glow transition hover:opacity-90 w-full sm:w-auto touch-manipulation`}
              >
                Get Started Free
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 w-full sm:w-auto touch-manipulation"
              >
                See how it works
              </a>
            </div>
          </div>

          <div data-reveal className={`${reveal} delay-100 hidden sm:block`}>
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
                  <p className="text-sm font-medium text-[var(--foreground)]">Attention Mechanisms in Neural Language Models</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Chen et al. · 2023 · Paper</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["transformer architecture", "neural plasticity", "self-attention"].map((k) => (
                      <span key={k} className="rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)] corpus-glow">
                        {k}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">Machine Learning</span>
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">Neuroscience</span>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-4 opacity-80">
                  <p className="text-sm font-medium text-[var(--foreground)]">Regional Climate Sensitivity and Feedback Loops</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Smith et al. · 2022 · Paper</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["climate modeling", "feedback mechanisms"].map((k) => (
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
            <h2 className="text-2xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">Built for how researchers actually work</h2>
          </div>
          <div className="mt-16 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                data-reveal
                className={`${reveal} group rounded-2xl border-[var(--border)] bg-[var(--card)]/30 p-8 transition-transform duration-300 hover:-translate-y-1 hover:border-[var(--accent)] touch-manipulation`}
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
            <h2 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">From paper to organized in seconds</h2>
          </div>

          <div className="relative mt-20 grid gap-12 lg:grid-cols-3 lg:gap-8">
            <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent lg:block" aria-hidden />
            <div className="pointer-events-none absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--accent)]/30 to-transparent lg:hidden" aria-hidden />
            {[
              {
                n: "01",
                icon: <IconSave />,
                title: "Save",
                desc: "Paste a DOI, URL, or ISBN. Or clip any page with the Chrome extension. Corpus fetches full citation metadata automatically.",
              },
              {
                n: "02",
                icon: <IconOrganize />,
                title: "Collaborate",
                desc: "Share papers with connections, build collections with your lab, and see what your research network is reading.",
              },
              {
                n: "03",
                icon: <IconSearch />,
                title: "Discover",
                desc: "Search your library, explore the knowledge graph, and surface unexpected connections between your sources.",
              },
            ].map((step) => (
              <div key={step.n} data-reveal className={`${reveal} relative pl-16 lg:pl-0 text-left`}>
                <div className="mb-6 flex justify-start">
                  <span className="text-4xl sm:text-5xl font-bold tabular-nums text-[var(--muted-foreground)]">{step.n}</span>
                </div>
                <div className="mb-4 flex justify-start">{step.icon}</div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal className={`${reveal} mx-auto max-w-2xl text-center`}>
            <h2 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">Simple pricing for researchers and students</h2>
            <p className="mt-4 text-[var(--muted-foreground)]">Start free. Upgrade when your research grows.</p>
          </div>

          <div data-reveal className={`${reveal} mt-16 grid gap-8 lg:grid-cols-2 md:grid-cols-1`}>
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
                  { text: "Up to 100 saved sources", included: true },
                  { text: "Papers, articles, books, and preprints", included: true },
                  { text: "AI keyword and topic extraction", included: true },
                  { text: "Full search and filtering", included: true },
                  { text: "Chrome extension", included: true },
                  { text: "Research connections", included: true },
                  { text: "Collaborative collections", included: false },
                  { text: "Knowledge graph", included: false },
                  { text: "Unlimited sources", included: false },
                ].map((feature) => (
                  <li key={feature.text} className="flex items-center gap-3">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full ${feature.included ? "bg-[var(--accent)]/20" : "bg-[var(--muted)]/30"}`}>
                      {feature.included ? (
                        <svg className="h-3 w-3 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3 text-[var(--muted-foreground)]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className={feature.included ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>{feature.text}</span>
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
                    {billing === "monthly" ? "$7" : "$5"}
                  </span>
                  <span className="text-[var(--muted-foreground)]">/month</span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {billing === "monthly" ? "Billed monthly" : "$60 billed annually"}
                </p>
              </div>

              <ul className="mb-8 space-y-4">
                {[
                  "Unlimited saved sources",
                  "Everything in Free",
                  "Collaborative collections",
                  "Semantic knowledge graph",
                  "Priority support",
                  "Early access to new features"
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
                  className={`block w-full rounded-lg bg-[var(--accent)] py-3 text-center font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent)]/90`}
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
              <span className="ml-2 rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-xs text-[var(--accent)]">Save $24/year</span>
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-[var(--border)] bg-[var(--background)] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4">
          <div data-reveal className={`${reveal} mx-auto max-w-2xl text-center`}>
            <h2 className="text-3xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">What researchers are saying</h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                quote: "Corpus replaced Zotero for me. The social layer means I actually discover papers I would have missed — my connections share things I never would have searched for.",
                role: "PhD Candidate, Computational Neuroscience",
              },
              {
                quote: "Our lab uses shared collections for every project now. It's the reading list tool we always wished existed.",
                role: "Postdoctoral Researcher, Molecular Biology",
              },
              {
                quote: "The AI tagging saves me hours every week. My papers organize themselves automatically — I just search for a topic and everything relevant appears instantly.",
                role: "Graduate Student, Political Theory",
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
                  className="flex min-h-[48px] w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]/50 touch-manipulation"
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
          <h2 className="text-2xl font-bold tracking-tight font-serif text-[var(--foreground)] sm:text-4xl">Start building your research network today.</h2>
          <p className="mt-4 text-sm sm:text-base text-[var(--muted-foreground)]">Free forever. No credit card required. Join researchers from leading universities.</p>
          <Link
            href="/login"
            className={`mt-10 inline-flex w-full sm:min-w-[200px] sm:w-auto justify-center rounded-lg px-8 py-4 text-base font-semibold text-content-inverse ${accentBg} shadow-xl shadow-accent/30 transition hover:bg-accent-hover touch-manipulation`}
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Hidden SEO paragraph */}
      <p className="sr-only">
        Corpus is a collaborative research platform and academic reference manager for researchers, academics, and students. Save research papers by DOI, ArXiv preprints by URL, and books by ISBN. Share papers with your research network, build collaborative reading lists with your lab or study group, and discover connections between sources using a semantic AI knowledge graph. A modern alternative to Zotero, Mendeley, and Readwise for collaborative academic research. Free personal research library with Pro plan for unlimited sources and advanced collaboration features. Used by graduate students, PhD candidates, postdoctoral researchers, and faculty at research universities.
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
