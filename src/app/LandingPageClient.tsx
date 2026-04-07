"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Database, Sparkles, Save, Repeat, BookOpen, Layers, CheckCircle } from "lucide-react";
import SoftwareApplicationJsonLd from "@/components/SoftwareApplicationJsonLd";

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

const fadeUpParams = {
  initial: { opacity: 0, y: 15 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.3 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function FeedEntry({ title, journal, time, isNew = false }: { title: string, journal: string, time: string, isNew?: boolean }) {
  return (
    <motion.div 
      variants={staggerItem}
      className="flex flex-col gap-2 p-4 rounded-xl border border-[#30302e] bg-[#30302e]/30 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-sans text-[15px] leading-snug font-medium text-[#faf9f5]">
          {title}
        </h3>
        {isNew && <span className="shrink-0 text-[10px] uppercase font-medium bg-[#c96442]/20 text-[#c96442] px-1.5 py-0.5 rounded-[4px] tracking-wide">New</span>}
      </div>
      <div className="flex items-center gap-3 text-[12px] text-[#b0aea5]">
        <span>{journal}</span>
        <span>•</span>
        <span>{time}</span>
      </div>
    </motion.div>
  );
}

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
    <div className="min-h-screen bg-[#141413] text-[#faf9f5] font-sans antialiased selection:bg-[#c96442]/30 selection:text-[#faf9f5]">
      <SoftwareApplicationJsonLd />
      
      {/* Dynamic Grain Background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] mix-blend-overlay z-0"
        style={{ backgroundImage: GRAIN_BG }}
        aria-hidden
      />

      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          navScrolled ? "bg-[#141413]/80 backdrop-blur-md border-b border-[#30302e]" : "bg-transparent border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 relative z-10">
          <Link href="/" className="text-[1.3rem] font-medium tracking-tight font-serif text-[#faf9f5] flex items-center gap-2">
            Corpus
          </Link>
          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login" className="text-[15px] font-medium text-[#b0aea5] transition-colors hover:text-[#faf9f5]">
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-[8px] px-4 py-2 text-[15px] font-medium text-[#faf9f5] bg-[#30302e] shadow-[0_0_0_1px_#30302e] hover:shadow-[0_0_0_1px_#4d4c48] transition-shadow duration-200"
            >
              Get Started
            </Link>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#30302e] text-[#b0aea5] md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#30302e] bg-[#141413]/95 px-4 py-4 backdrop-blur-md md:hidden relative z-10">
             <div className="flex flex-col gap-3">
               <Link href="/login" className="py-2 font-medium text-[#faf9f5] text-[15px]">Sign In</Link>
               <Link href="/login" className="rounded-lg py-2 text-center font-medium text-[#faf9f5] bg-[#c96442] shadow-[0_0_0_1px_#c96442]">Get Started</Link>
             </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* 1. Hero Section */}
        <section className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-24 pb-16">
          <div className="mx-auto grid max-w-6xl gap-16 px-4 lg:grid-cols-2 lg:items-center lg:gap-12">
            
            {/* Left: Copy */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-xl"
            >
              <h1 className="text-[3.25rem] sm:text-[4rem] leading-[1.10] font-serif font-medium text-[#faf9f5] tracking-tight">
                Your research feed.<br /> Automated.
              </h1>
              <p className="mt-6 text-[1.06rem] sm:text-[1.25rem] leading-[1.60] text-[#b0aea5]">
                Stop searching for papers. New research appears automatically—summarized, deduplicated, and ready to save. No noise, just the insights you need.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-[8px] px-[16px] py-[12px] text-[16px] font-medium text-[#faf9f5] bg-[#c96442] shadow-[0_0_0_1px_#c96442] transition-colors hover:bg-[#d97757] hover:shadow-[0_0_0_1px_#d97757]"
                >
                  Get your feed
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-[8px] px-[16px] py-[12px] text-[16px] font-medium text-[#b0aea5] bg-[#30302e] shadow-[0_0_0_1px_#30302e] transition hover:text-[#faf9f5] hover:shadow-[0_0_0_1px_#4d4c48]"
                >
                  Start tracking research
                </Link>
              </div>
            </motion.div>

            {/* Right: Animated Feed Visual */}
            <div className="relative mt-12 lg:mt-0">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#30302e]/0 via-[#30302e]/30 to-[#30302e]/0 rounded-3xl blur-2xl" />
              <div className="relative rounded-[16px] border border-[#30302e] bg-[#141413] shadow-[rgba(0,0,0,0.05)_0px_4px_24px] overflow-hidden">
                <div className="border-b border-[#30302e] p-4 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#30302e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#30302e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#30302e]" />
                  </div>
                  <span className="text-[12px] font-medium text-[#87867f]">Incoming Research</span>
                </div>
                
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="p-4 space-y-3 bg-[#141413]"
                >
                  <FeedEntry 
                    title="Attention Is All You Need: A Retrospective Analysis" 
                    journal="Nature Communications" 
                    time="10 mins ago" 
                    isNew={true}
                  />
                  <FeedEntry 
                    title="Emergent Abilities of Large Language Models in Scientific Reasoning" 
                    journal="arXiv cs.AI" 
                    time="1 hour ago" 
                    isNew={true}
                  />
                  <FeedEntry 
                    title="Optimization Dynamics in Neural Network Training" 
                    journal="JMLR" 
                    time="3 hours ago" 
                  />
                  <FeedEntry 
                    title="Scaling Laws for Autoregressive Generative Modeling" 
                    journal="arXiv cs.LG" 
                    time="Yesterday" 
                  />
                </motion.div>
                
                {/* Fade out bottom */}
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#141413] to-transparent pointer-events-none" />
              </div>
            </div>

          </div>
        </section>

        {/* 2. "How it works" */}
        <section className="py-24 border-y border-[#30302e] bg-[#141413]">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-12 sm:grid-cols-3">
              {[
                { step: "01", title: "Add topics or sources", icon: <Plus className="w-5 h-5 text-[#c96442]" /> },
                { step: "02", title: "We track and update your feed", icon: <Database className="w-5 h-5 text-[#c96442]" /> },
                { step: "03", title: "Read, summarize, and save", icon: <BookOpen className="w-5 h-5 text-[#c96442]" /> },
              ].map((item, i) => (
                <motion.div 
                  key={item.step}
                  {...fadeUpParams}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="flex flex-col"
                >
                  <div className="w-12 h-12 rounded-[8px] bg-[#30302e]/50 border border-[#30302e] flex items-center justify-center mb-6 shadow-[0_0_0_1px_#30302e]">
                    {item.icon}
                  </div>
                  <h3 className="text-[1.3rem] font-serif font-medium text-[#faf9f5] mb-2">{item.title}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Core Loop Visualization */}
        <section className="py-32 bg-[#141413] overflow-hidden">
          <div className="mx-auto max-w-6xl px-4">
            <motion.div {...fadeUpParams} className="text-center mb-16">
               <h2 className="text-[2rem] sm:text-[2.3rem] font-serif font-medium text-[#faf9f5]">This keeps working without you.</h2>
            </motion.div>

            <motion.div 
              {...fadeUpParams}
              className="relative rounded-[16px] border border-[#30302e] bg-[#30302e]/10 p-8 sm:p-16 overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
            >
               {/* Animated Loop Highlight */}
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full border border-[#c96442]/10 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(201,100,66,0)_0%,rgba(201,100,66,0.1)_50%,rgba(201,100,66,0)_100%)] pointer-events-none opacity-50"
               />

               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
                 {[
                   { label: "INPUT", icon: <Plus className="w-5 h-5" /> },
                   { label: "FEED", icon: <Database className="w-5 h-5" /> },
                   { label: "SUMMARY", icon: <Sparkles className="w-5 h-5" /> },
                   { label: "SAVE", icon: <Save className="w-5 h-5" /> },
                   { label: "REPEAT", icon: <Repeat className="w-5 h-5" /> },
                 ].map((stage, i, arr) => (
                   <div key={stage.label} className="flex flex-col md:flex-row items-center gap-8 md:gap-4 flex-1 justify-center">
                     <div className="flex flex-col items-center gap-4">
                       <div className="w-16 h-16 rounded-full bg-[#141413] border border-[#30302e] text-[#b0aea5] flex items-center justify-center shadow-[rgba(0,0,0,0.05)_0px_4px_24px]">
                         {stage.icon}
                       </div>
                       <span className="text-[12px] font-sans font-medium text-[#87867f] tracking-widest uppercase">{stage.label}</span>
                     </div>
                     {i < arr.length - 1 && (
                       <div className="flex justify-center items-center text-[#30302e] h-8 md:h-auto">
                         <ArrowRight className="w-5 h-5 rotate-90 md:rotate-0" />
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            </motion.div>
          </div>
        </section>

        {/* 4. Feature Highlights */}
        <section className="py-24 border-y border-[#30302e] bg-[#141413]">
          <div className="mx-auto max-w-6xl px-4 grid gap-8 sm:grid-cols-2">
             {[
               { title: "Automated research feed", desc: "Your sources are polled continuously. Papers arrive without you searching.", icon: <Repeat className="w-5 h-5" /> },
               { title: "AI summaries", desc: "Every paper is instantly summarized. Skim hours of research in minutes.", icon: <Sparkles className="w-5 h-5" /> },
               { title: "Deduplication", desc: "No repeated content. We merge preprints and published versions.", icon: <CheckCircle className="w-5 h-5" /> },
               { title: "Collections", desc: "Save papers to custom collections. Organize your thinking seamlessly.", icon: <Layers className="w-5 h-5" /> },
             ].map((feature, i) => (
                <motion.div 
                  key={feature.title}
                  {...fadeUpParams}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="rounded-[16px] border border-[#30302e] bg-[#141413] p-8 hover:bg-[#30302e]/20 transition duration-300 shadow-[rgba(0,0,0,0.05)_0px_4px_24px]"
                >
                   <div className="w-10 h-10 rounded-[8px] bg-[#141413] border border-[#30302e] flex items-center justify-center text-[#c96442] shadow-[0_0_0_1px_#30302e] mb-6">
                     {feature.icon}
                   </div>
                   <h3 className="text-[1.3rem] font-serif font-medium text-[#faf9f5] mb-3">{feature.title}</h3>
                   <p className="text-[16px] text-[#b0aea5] leading-[1.60]">{feature.desc}</p>
                </motion.div>
             ))}
          </div>
        </section>

        {/* 5. Context & Final CTA */}
        <section className="py-32 bg-[#141413] text-center px-4">
          <div className="mx-auto max-w-2xl">
             <motion.div {...fadeUpParams}>
               <p className="text-[12px] font-sans text-[#87867f] uppercase tracking-[0.12em] font-medium mb-6">
                 Built by students. Used for tracking technical content.
               </p>
               <h2 className="text-[2.3rem] sm:text-[3.25rem] font-serif font-medium text-[#faf9f5] leading-[1.10] mb-10">
                 Set it once.<br />It keeps updating.
               </h2>
               <Link
                 href="/login"
                 className="inline-flex items-center justify-center rounded-[12px] px-[24px] py-[16px] text-[16px] font-medium text-[#faf9f5] bg-[#c96442] shadow-[0_0_0_1px_#c96442] hover:bg-[#d97757] hover:shadow-[0_0_0_1px_#d97757] transition-colors"
               >
                 Get started free
               </Link>
             </motion.div>
          </div>
        </section>

      </main>

      <footer className="border-t border-[#30302e] bg-[#141413] py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start text-center sm:text-left">
            <span className="text-[1.06rem] font-serif font-medium text-[#faf9f5]">Corpus</span>
            <p className="text-[14px] font-sans text-[#5e5d59]">© {new Date().getFullYear()} Corpus. All rights reserved.</p>
          </div>
          <div className="flex gap-8 text-[15px] font-sans text-[#87867f]">
            <Link href="/privacy" className="transition hover:text-[#faf9f5]">Privacy</Link>
            <Link href="/pricing" className="transition hover:text-[#faf9f5]">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
