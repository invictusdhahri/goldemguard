"use client";

import { motion } from "framer-motion";
import { ImageIcon, Film, Mic, FileText, BarChart3, Lock } from "lucide-react";
import FadeInUp from "./FadeInUp";

const FEATURES = [
  {
    id: "image",
    icon: ImageIcon,
    title: "Image Detection",
    model: "SightEngine + Grok + Claude",
    accuracy: "Multi-signal",
    description:
      "SightEngine generative-AI scores, xAI Grok vision reasoning (optional web grounding), and Claude Haiku synthesis—fused with an explicit policy so the final label is an ensemble outcome.",
    tag: "Computer Vision",
    span: "md:col-span-2",
    accentVar: "--color-cyan",
  },
  {
    id: "audio",
    icon: Mic,
    title: "Audio Detection",
    model: "Resemble AI",
    accuracy: "Deepfake",
    description:
      "Resemble AI analyzes uploaded audio (and extracted video audio) for synthetic speech, with structured evidence and chunk-level scores.",
    tag: "Signal Analysis",
    span: "md:col-span-1",
    accentVar: "--color-purple",
  },
  {
    id: "stats",
    icon: BarChart3,
    title: "Explainable verdicts",
    model: "Fusion + evidence",
    accuracy: null,
    description:
      "Per-model scores, which detectors ran or were skipped (and why), signals, and a plain-English explanation—so results are auditable, not a single opaque number.",
    tag: "Explainability",
    span: "md:col-span-1",
    accentVar: "--color-verified",
    small: true,
  },
  {
    id: "video",
    icon: Film,
    title: "Video Detection",
    model: "Resemble + SightEngine + Grok + Claude",
    accuracy: "Audio-first",
    description:
      "Short audio segment via Resemble can short-circuit on synthetic speech; SightEngine video (or key-frame fallback), Grok on a representative frame, and Claude for synthesis.",
    tag: "Temporal Analysis",
    span: "md:col-span-2",
    accentVar: "--color-warn",
  },
  {
    id: "docs",
    icon: FileText,
    title: "Document Detection",
    model: "Sapling AI",
    accuracy: "Doc-level",
    description:
      "Text extracted from PDF and DOCX is scored by Sapling for AI-likeness, with optional high-probability sentence signals when available.",
    tag: "NLP Analysis",
    span: "md:col-span-2",
    accentVar: "--color-cyan",
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Account-scoped storage",
    model: "Supabase + JWT",
    accuracy: null,
    description:
      "Authenticated uploads go to a private Supabase Storage bucket; jobs and results are row-level secured and tied to your account—not a public drop zone.",
    tag: "Privacy",
    span: "md:col-span-1",
    accentVar: "--color-verified",
    small: true,
  },
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={item}
      className={`liquid-glass-card p-6 flex flex-col gap-4 cursor-default ${feature.span}`}
    >
      {/* Icon + tag row */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `color-mix(in srgb, var(${feature.accentVar}) 12%, transparent)`,
            border: `1px solid color-mix(in srgb, var(${feature.accentVar}) 20%, transparent)`,
          }}
        >
          <Icon size={18} style={{ color: `var(${feature.accentVar})` }} />
        </div>
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{
            background: `color-mix(in srgb, var(${feature.accentVar}) 10%, transparent)`,
            border: `1px solid color-mix(in srgb, var(${feature.accentVar}) 18%, transparent)`,
            color: `var(${feature.accentVar})`,
          }}
        >
          {feature.tag}
        </span>
      </div>

      {/* Title + accuracy */}
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="flex items-baseline gap-2">
          <h3
            className="font-semibold text-[15px]"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}
          >
            {feature.title}
          </h3>
          {feature.accuracy && (
            <span
              className="text-xs font-bold"
              style={{
                fontFamily: "var(--font-mono)",
                color: `var(${feature.accentVar})`,
              }}
            >
              {feature.accuracy}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          {feature.description}
        </p>
      </div>

      {/* Model badge */}
      <div
        className="inline-flex self-start items-center px-2.5 py-1 rounded-lg text-xs max-w-full break-words"
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border-subtle)",
          color: "var(--muted-foreground)",
        }}
      >
        {feature.model}
      </div>
    </motion.div>
  );
}

export default function BentoFeatures() {
  return (
    <section
      id="features"
      className="relative section-padding overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, var(--color-purple-glow), transparent 70%)",
          opacity: 0.4,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <FadeInUp className="flex flex-col items-center text-center gap-4 mb-10 sm:mb-14">
          <span className="badge-glass">Detection Modalities</span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance px-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span style={{ color: "var(--foreground)" }}>Detect Across</span>{" "}
            <span className="gradient-text-purple">Every Medium</span>
          </h2>
          <p className="text-sm sm:text-base max-w-xl text-pretty" style={{ color: "var(--muted-foreground)" }}>
            Production stack: SightEngine, xAI Grok, Anthropic Claude, Resemble, and Sapling—composed per modality with
            documented fusion. One backend API coordinates them all.
          </p>
        </FadeInUp>

        {/* Bento grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
