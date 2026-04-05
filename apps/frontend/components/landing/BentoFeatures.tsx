"use client";

import { motion } from "framer-motion";
import { ImageIcon, Film, Mic, FileText, BarChart3, Lock } from "lucide-react";
import FadeInUp from "./FadeInUp";

const FEATURES = [
  {
    id: "image",
    icon: ImageIcon,
    title: "Image Detection",
    model: "SigLIP v1",
    accuracy: "94.4%",
    description:
      "SigLIP semantic embeddings and GAN fingerprint analysis distinguish AI-generated images from authentic photography with sub-second precision.",
    tag: "Computer Vision",
    span: "md:col-span-2",
    accentVar: "--color-cyan",
  },
  {
    id: "audio",
    icon: Mic,
    title: "Audio Detection",
    model: "AASIST3",
    accuracy: "91.2%",
    description: "Anti-spoofing graph attention network trained on voice synthesis artifacts and deepfake audio patterns.",
    tag: "Signal Analysis",
    span: "md:col-span-1",
    accentVar: "--color-purple",
  },
  {
    id: "stats",
    icon: BarChart3,
    title: "Live Confidence",
    model: "Ensemble",
    accuracy: null,
    description: "Real-time confidence scoring with per-region attribution maps — understand exactly why a verdict was reached.",
    tag: "Explainability",
    span: "md:col-span-1",
    accentVar: "--color-verified",
    small: true,
  },
  {
    id: "video",
    icon: Film,
    title: "Video Detection",
    model: "GenConViT",
    accuracy: "89.7%",
    description: "Temporal behavioral analysis across frames detects deepfakes that fool single-frame classifiers.",
    tag: "Temporal Analysis",
    span: "md:col-span-2",
    accentVar: "--color-warn",
  },
  {
    id: "docs",
    icon: FileText,
    title: "Document Detection",
    model: "GPTZero + Perplexity",
    accuracy: "92.1%",
    description:
      "Dual-model ensemble scores burstiness and perplexity to identify LLM-generated text across all major AI writers.",
    tag: "NLP Analysis",
    span: "md:col-span-2",
    accentVar: "--color-cyan",
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Zero Retention",
    model: "Privacy-First",
    accuracy: null,
    description: "Files analyzed in-memory, never stored. Enterprise-grade privacy by design.",
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
        className="inline-flex self-start items-center px-2.5 py-1 rounded-lg text-xs"
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

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <FadeInUp className="flex flex-col items-center text-center gap-4 mb-14">
          <span className="badge-glass">Detection Modalities</span>
          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span style={{ color: "var(--foreground)" }}>Detect Across</span>{" "}
            <span className="gradient-text-purple">Every Medium</span>
          </h2>
          <p className="text-base max-w-xl" style={{ color: "var(--muted-foreground)" }}>
            Four specialized AI models, each trained on domain-specific artifacts. One unified API to interrogate them all.
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
