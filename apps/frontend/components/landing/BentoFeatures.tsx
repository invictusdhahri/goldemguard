"use client";

import { useRef, useEffect, useState } from "react";
import { ImageIcon, Film, Mic, FileText, BarChart3, Lock } from "lucide-react";

const FEATURES = [
  {
    id: "image",
    icon: ImageIcon,
    title: "Image Detection",
    model: "SigLIP v1",
    accuracy: "94.4%",
    description:
      "Google's SigLIP model analyzes semantic embeddings and GAN fingerprints to distinguish AI-generated images from authentic photography.",
    tag: "Computer Vision",
    tagColor: "#00d4ff",
    col: "col-span-2",
    row: "row-span-1",
    accent: "#00d4ff",
  },
  {
    id: "audio",
    icon: Mic,
    title: "Audio Detection",
    model: "AASIST3",
    accuracy: "91.2%",
    description: "Anti-spoofing graph attention network trained on voice synthesis artifacts.",
    tag: "Signal Analysis",
    tagColor: "#8b5cf6",
    col: "col-span-1",
    row: "row-span-1",
    accent: "#8b5cf6",
  },
  {
    id: "stats",
    icon: BarChart3,
    title: "Live Confidence",
    model: "Ensemble",
    accuracy: null,
    description: "Real-time confidence scoring with per-region attribution maps.",
    tag: "Explainability",
    tagColor: "#10b981",
    col: "col-span-1",
    row: "row-span-1",
    accent: "#10b981",
    isSmall: true,
  },
  {
    id: "video",
    icon: Film,
    title: "Video Detection",
    model: "GenConViT",
    accuracy: "89.7%",
    description: "Temporal behavioral analysis across frames detects deepfakes that fool single-frame classifiers.",
    tag: "Temporal Analysis",
    tagColor: "#f59e0b",
    col: "col-span-1",
    row: "row-span-1",
    accent: "#f59e0b",
  },
  {
    id: "docs",
    icon: FileText,
    title: "Document Detection",
    model: "GPTZero + Perplexity",
    accuracy: "92.1%",
    description:
      "Dual-model ensemble scores burstiness and perplexity patterns to identify LLM-generated text across all major AI writers.",
    tag: "NLP Analysis",
    tagColor: "#00d4ff",
    col: "col-span-2",
    row: "row-span-1",
    accent: "#00d4ff",
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Zero Retention",
    model: "Privacy-First",
    accuracy: null,
    description: "Files are analyzed in-memory and never stored. Enterprise-grade privacy by default.",
    tag: "Privacy",
    tagColor: "#10b981",
    col: "col-span-1",
    row: "row-span-1",
    accent: "#10b981",
    isSmall: true,
  },
];

function AccuracyBar({ value, color }: { value: number; color: string }) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setWidth(value); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 6px ${color}66`,
          transition: "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const Icon = feature.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`glass-card rounded-2xl p-6 flex flex-col gap-4 cursor-default ${feature.col} ${feature.row}`}
      style={{
        minHeight: feature.isSmall ? "160px" : "auto",
        transitionDelay: `${index * 60}ms`,
        borderColor: hovered ? `${feature.accent}33` : undefined,
        boxShadow: hovered ? `0 0 40px ${feature.accent}0a, inset 0 1px 0 ${feature.accent}15` : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${feature.accent}15`,
            border: `1px solid ${feature.accent}25`,
            transition: "all 0.3s ease",
            boxShadow: hovered ? `0 0 16px ${feature.accent}30` : "none",
          }}
        >
          <Icon size={18} style={{ color: feature.accent }} />
        </div>

        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            background: `${feature.accent}10`,
            border: `1px solid ${feature.accent}20`,
            color: feature.accent,
          }}
        >
          {feature.tag}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-2">
          <h3
            className="font-semibold text-[15px]"
            style={{ color: "#e2e8f0", fontFamily: "var(--font-display)" }}
          >
            {feature.title}
          </h3>
          {feature.accuracy && (
            <span
              className="text-xs font-bold font-mono"
              style={{ color: feature.accent }}
            >
              {feature.accuracy}
            </span>
          )}
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
          {feature.description}
        </p>
      </div>

      {feature.accuracy && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: "#475569" }}>
              {feature.model}
            </span>
            <span className="text-xs font-mono" style={{ color: feature.accent }}>
              {feature.accuracy} acc.
            </span>
          </div>
          <AccuracyBar value={parseFloat(feature.accuracy)} color={feature.accent} />
        </div>
      )}

      {!feature.accuracy && (
        <div
          className="text-xs font-mono px-2 py-1 rounded self-start"
          style={{
            background: `${feature.accent}10`,
            color: feature.accent,
            border: `1px solid ${feature.accent}20`,
          }}
        >
          {feature.model}
        </div>
      )}
    </div>
  );
}

export default function BentoFeatures() {
  return (
    <section id="features" className="relative py-28" style={{ background: "#07070e" }}>
      {/* Subtle radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="flex flex-col items-center text-center gap-4 mb-16">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.2)",
              color: "#8b5cf6",
            }}
          >
            Detection Modalities
          </div>
          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight"
            style={{ color: "#e2e8f0", fontFamily: "var(--font-display)" }}
          >
            Detect Across{" "}
            <span className="gradient-text-purple">Every Medium</span>
          </h2>
          <p className="text-base max-w-xl" style={{ color: "#64748b" }}>
            Four specialized AI models, each trained on domain-specific artifacts.
            One unified API to interrogate them all.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.id} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
