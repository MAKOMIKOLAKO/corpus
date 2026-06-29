"use client";

import { useState } from "react";
import { BookOpen, Compass, ExternalLink, Loader2, Plus, Check } from "lucide-react";

interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  abstract: string;
  openAccess: boolean;
  citationCount: number;
  doi?: string;
}

const MOCK_PAPERS: Paper[] = [
  {
    id: "p1",
    title: "Attention Is All You Need",
    authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit"],
    year: 2017,
    venue: "NeurIPS",
    abstract:
      "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.",
    openAccess: true,
    citationCount: 98412,
    doi: "10.48550/arXiv.1706.03762",
  },
  {
    id: "p2",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"],
    year: 2019,
    venue: "NAACL",
    abstract:
      "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
    openAccess: true,
    citationCount: 62301,
    doi: "10.18653/v1/N19-1423",
  },
  {
    id: "p3",
    title: "ImageNet Large Scale Visual Recognition Challenge",
    authors: ["Olga Russakovsky", "Jia Deng", "Hao Su", "Jonathan Krause"],
    year: 2015,
    venue: "International Journal of Computer Vision",
    abstract:
      "The ImageNet Large Scale Visual Recognition Challenge is a benchmark in object category classification and detection on hundreds of object categories and millions of images. The challenge has been run annually from 2010 to present, attracting participation from more than fifty institutions.",
    openAccess: false,
    citationCount: 44218,
    doi: "10.1007/s11263-015-0816-y",
  },
  {
    id: "p4",
    title: "Deep Residual Learning for Image Recognition",
    authors: ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"],
    year: 2016,
    venue: "CVPR",
    abstract:
      "We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.",
    openAccess: true,
    citationCount: 175631,
    doi: "10.1109/CVPR.2016.90",
  },
  {
    id: "p5",
    title: "Generative Adversarial Networks",
    authors: ["Ian Goodfellow", "Jean Pouget-Abadie", "Mehdi Mirza", "Bing Xu"],
    year: 2014,
    venue: "NeurIPS",
    abstract:
      "We propose a new framework for estimating generative models via an adversarial process, in which we simultaneously train two models: a generative model G that captures the data distribution, and a discriminative model D that estimates the probability that a sample came from the training data rather than G.",
    openAccess: true,
    citationCount: 59803,
    doi: "10.48550/arXiv.1406.2661",
  },
  {
    id: "p6",
    title: "Language Models are Few-Shot Learners",
    authors: ["Tom Brown", "Benjamin Mann", "Nick Ryder", "Melanie Subbiah"],
    year: 2020,
    venue: "NeurIPS",
    abstract:
      "We demonstrate that scaling language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches. GPT-3, an autoregressive language model with 175 billion parameters, achieves strong performance on many NLP datasets.",
    openAccess: true,
    citationCount: 31205,
    doi: "10.48550/arXiv.2005.14165",
  },
  {
    id: "p7",
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    authors: ["Patrick Lewis", "Ethan Perez", "Aleksandra Piktus", "Fabio Petroni"],
    year: 2020,
    venue: "NeurIPS",
    abstract:
      "Large pre-trained language models have been shown to store factual knowledge in their parameters. We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) — models which combine pre-trained parametric and non-parametric memory for language generation.",
    openAccess: true,
    citationCount: 8912,
    doi: "10.48550/arXiv.2005.11401",
  },
  {
    id: "p8",
    title: "Constitutional AI: Harmlessness from AI Feedback",
    authors: ["Yuntao Bai", "Saurav Kadavath", "Sandipan Kundu", "Amanda Askell"],
    year: 2022,
    venue: "arXiv",
    abstract:
      "As AI systems become more capable, we would like to enlist their help to supervise other AIs. We experiment with methods for training a harmless AI assistant through self-improvement, without any human labels identifying harmful outputs. The only human oversight is provided through a list of rules or principles, and so we refer to the method as Constitutional AI.",
    openAccess: true,
    citationCount: 2341,
    doi: "10.48550/arXiv.2212.08073",
  },
  {
    id: "p9",
    title: "Scaling Laws for Neural Language Models",
    authors: ["Jared Kaplan", "Sam McCandlish", "Tom Henighan", "Tom Brown"],
    year: 2020,
    venue: "arXiv",
    abstract:
      "We study empirical scaling laws for language model performance on the cross-entropy loss. The loss scales as a power-law with model size, dataset size, and the amount of compute used for training, with some trends spanning more than seven orders of magnitude.",
    openAccess: true,
    citationCount: 5432,
    doi: "10.48550/arXiv.2001.08361",
  },
  {
    id: "p10",
    title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    authors: ["Jason Wei", "Xuezhi Wang", "Dale Schuurmans", "Maarten Bosma"],
    year: 2022,
    venue: "NeurIPS",
    abstract:
      "We explore how generating a chain of thought — a series of intermediate reasoning steps — significantly improves the ability of large language models to perform complex reasoning. In particular, we show how such reasoning abilities emerge naturally in sufficiently large language models via a simple method called chain-of-thought prompting.",
    openAccess: true,
    citationCount: 7891,
    doi: "10.48550/arXiv.2201.11903",
  },
];

type SaveState = "idle" | "saving" | "saved" | "error";

function formatCitations(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function PaperCard({ paper }: { paper: Paper }) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [expanded, setExpanded] = useState(false);

  const handleSave = async () => {
    if (saveState !== "idle") return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType: "PAPER",
          title: paper.title,
          authors: paper.authors.join(", "),
          year: String(paper.year),
          source: paper.venue,
          doi: paper.doi ?? "",
          abstract: paper.abstract,
          openAccessUrl: paper.doi ? `https://doi.org/${paper.doi}` : "",
          notes: "",
          readingStatus: "TO_READ",
        }),
      });
      if (res.ok || res.status === 409) {
        setSaveState("saved");
      } else {
        setSaveState("error");
        setTimeout(() => setSaveState("idle"), 2000);
      }
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  return (
    <article
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex flex-col gap-3 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug text-[var(--foreground)] line-clamp-2">
            {paper.title}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--content-secondary)] truncate">
            {paper.authors.slice(0, 3).join(", ")}
            {paper.authors.length > 3 && " et al."}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveState !== "idle"}
          aria-label={saveState === "saved" ? "Saved" : "Save to Library"}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
            saveState === "saved"
              ? "bg-[var(--accent-muted)] text-[var(--accent)] cursor-default"
              : saveState === "error"
              ? "bg-red-500/10 text-red-500 cursor-default"
              : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          }`}
        >
          {saveState === "saving" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saveState === "saved" ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {saveState === "saved" ? "Saved" : saveState === "error" ? "Error" : "Save"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-sunken)] text-[var(--content-secondary)] font-medium">
          {paper.venue}
        </span>
        <span className="text-[var(--content-tertiary)]">{paper.year}</span>
        <span className="text-[var(--border-strong)]">·</span>
        <span className="text-[var(--content-tertiary)]">
          {formatCitations(paper.citationCount)} citations
        </span>
        {paper.openAccess && (
          <>
            <span className="text-[var(--border-strong)]">·</span>
            <span className="text-emerald-600 font-medium">Open Access</span>
          </>
        )}
      </div>

      <p
        className={`text-[13px] leading-relaxed text-[var(--content-secondary)] ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {paper.abstract}
      </p>

      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[12px] text-[var(--accent)] hover:underline focus:outline-none"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
        {paper.doi && (
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-[var(--content-tertiary)] hover:text-[var(--content-secondary)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            DOI
          </a>
        )}
      </div>
    </article>
  );
}

export default function DiscoverPageClient() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[var(--accent)]" />
          <h1 className="text-2xl font-serif font-medium text-[var(--foreground)]">Discover</h1>
        </div>
        <p className="text-[14px] text-[var(--content-secondary)]">
          Recommended papers based on your library. Save any to start reading.
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[13px] text-[var(--content-tertiary)]">
        <BookOpen className="w-4 h-4 shrink-0" />
        <span>
          Showing curated recommendations — personalized discovery coming soon.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {MOCK_PAPERS.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </div>
  );
}
