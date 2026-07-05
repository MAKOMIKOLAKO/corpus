"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, BookOpen, Layers, GraduationCap } from "lucide-react";
import SoftwareApplicationJsonLd from "@/components/SoftwareApplicationJsonLd";
import WebSiteJsonLd from "@/components/WebSiteJsonLd";
import OrganizationJsonLd from "@/components/OrganizationJsonLd";

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

const fadeUpParams = {
  initial: { opacity: 0, y: 15 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.3 }
};

export default function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#f0ede4] text-[#1e2d27] font-sans antialiased selection:bg-[#c96442]/20 selection:text-[#1e2d27] transition-colors duration-300">
      <SoftwareApplicationJsonLd />
      <WebSiteJsonLd />
      <OrganizationJsonLd />

      {/* Dynamic Grain Background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] mix-blend-overlay z-0"
        style={{ backgroundImage: GRAIN_BG }}
        aria-hidden
      />

      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${navScrolled ? "bg-[#f0ede4]/80 backdrop-blur-md border-b border-[#e8e4d8]" : "bg-transparent border-transparent"
          }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 relative z-10">
          <Link href="/" className="text-[1.3rem] font-medium tracking-tight font-serif text-[#1e2d27] flex items-center gap-2 transition-colors">
            Corpus
          </Link>
          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login" className="text-[15px] font-medium text-[#4a5e56] transition-colors hover:text-[#1e2d27]">
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-[8px] px-4 py-2 text-[15px] font-medium text-[#2d3d36] bg-[#e2ddd4] shadow-[0_0_0_1px_#ccc8bc] hover:shadow-[0_0_0_1px_#b8c4be] transition-shadow duration-200"
            >
              Get Started
            </Link>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e8e4d8] text-[#4a5e56] md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#e8e4d8] bg-[#f0ede4]/95 px-4 py-4 backdrop-blur-md md:hidden relative z-10 transition-colors">
            <div className="flex flex-col gap-3">
              <Link href="/login" className="py-2 font-medium text-[#1e2d27] text-[15px]">Sign In</Link>
              <Link href="/login" className="rounded-lg py-2 text-center font-medium text-[#f7f4ee] bg-[#c96442] shadow-[0_0_0_1px_#c96442]">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* 1. Hero Section */}
        <section className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-24 pb-16">
          <div className="mx-auto max-w-6xl px-4 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl"
            >
              <h1 className="text-[3.25rem] sm:text-[4rem] leading-[1.10] font-serif font-medium text-[#1e2d27] tracking-tight transition-colors">
                Keep track of everything you&apos;ve read — before it slips away.
              </h1>
              <p className="mt-6 text-[1.06rem] sm:text-[1.25rem] leading-[1.60] text-[#4a5e56] transition-colors">
                Corpus organizes your papers and sources into collections, then recommends what to read next based on your library as a whole — not one-off paper matching. It&apos;s not another discovery engine; it&apos;s a place to keep what you&apos;ve already found and build on it.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-[8px] px-[16px] py-[12px] text-[16px] font-medium text-[#f7f4ee] bg-[#c96442] shadow-[0_0_0_1px_#c96442] transition-colors hover:bg-[#d97757] hover:shadow-[0_0_0_1px_#d97757]"
                >
                  Try Corpus free
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-[8px] px-[16px] py-[12px] text-[16px] font-medium text-[#2d3d36] bg-[#e2ddd4] shadow-[0_0_0_1px_#ccc8bc] transition hover:text-[#1e2d27] hover:shadow-[0_0_0_1px_#b8c4be]"
                >
                  Sign in
                </Link>
              </div>
              <p className="mt-4 text-[13px] text-[#7a8e86] transition-colors">
                Free for researchers and students — donation-supported, no premium tier.
              </p>
            </motion.div>
          </div>
        </section>

        {/* 2. Feature Highlights */}
        <section className="py-24 border-y border-[#e8e4d8] bg-[#f0ede4] transition-colors">
          <div className="mx-auto max-w-6xl px-4 grid gap-8 sm:grid-cols-2">
            {[
              { title: "Add anything", desc: "Paste a DOI, URL, or title. Corpus pulls the metadata automatically.", icon: <Plus className="w-5 h-5" /> },
              { title: "Track your reading", desc: "Mark entries as Unread, In Progress, or Completed. See your queue at a glance.", icon: <BookOpen className="w-5 h-5" /> },
              { title: "Organize into collections", desc: "Group papers and articles into named collections. Find anything instantly.", icon: <Layers className="w-5 h-5" /> },
              { title: "Built for researchers", desc: "Designed for students and academics who read a lot and need to stay organized.", icon: <GraduationCap className="w-5 h-5" /> },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                {...fadeUpParams}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-[16px] border border-[#e8e4d8] bg-[#f7f4ee] p-8 hover:bg-[#e8e4d8] transition duration-300 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]"
              >
                <div className="w-10 h-10 rounded-[8px] bg-[#f7f4ee] border border-[#e8e4d8] flex items-center justify-center text-[#c96442] shadow-[0_0_0_1px_#e8e4d8] mb-6 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-[1.3rem] font-serif font-medium text-[#1e2d27] mb-3 transition-colors">{feature.title}</h3>
                <p className="text-[16px] text-[#4a5e56] leading-[1.60] transition-colors">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 3. Tagline Section */}
        <section className="py-32 bg-[#f7f4ee] overflow-hidden transition-colors">
          <div className="mx-auto max-w-6xl px-4">
            <motion.div {...fadeUpParams} className="text-center">
              <h2 className="text-[2rem] sm:text-[2.3rem] font-serif font-medium text-[#1e2d27] transition-colors">Read more. Forget less.</h2>
              <p className="mt-6 text-[1.06rem] text-[#4a5e56] transition-colors">
                Corpus keeps your reading list organized so you can focus on the work.
              </p>
            </motion.div>
          </div>
        </section>

        {/* 4. Footer CTA */}
        <section className="py-32 bg-[#f0ede4] text-center px-4 transition-colors">
          <div className="mx-auto max-w-2xl">
            <motion.div {...fadeUpParams}>
              <h2 className="text-[2.3rem] sm:text-[3.25rem] font-serif font-medium text-[#1e2d27] leading-[1.10] mb-10 transition-colors">
                Start building your library.
              </h2>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-[12px] px-[24px] py-[16px] text-[16px] font-medium text-[#f7f4ee] bg-[#c96442] shadow-[0_0_0_1px_#c96442] hover:bg-[#d97757] hover:shadow-[0_0_0_1px_#d97757] transition-colors"
              >
                Get started free
              </Link>
            </motion.div>
          </div>
        </section>

      </main>

      <footer className="border-t border-[#e8e4d8] bg-[#f0ede4] py-12 transition-colors">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start text-center sm:text-left">
            <span className="text-[1.06rem] font-serif font-medium text-[#1e2d27] transition-colors">Corpus</span>
            <p className="text-[14px] font-sans text-[#7a8e86] transition-colors">© {new Date().getFullYear()} Corpus. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
