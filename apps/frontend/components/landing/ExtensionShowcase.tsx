"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { AppWindow, ShieldCheck, X, Scan, Eye, Zap, ArrowRight } from "lucide-react";
import FadeInUp from "./FadeInUp";

/** Fixed Unsplash URLs — varied subjects, deterministic (no SSR/client random mismatch). */
const MOCK_TWEETS = [
  {
    handle: "@news_daily",
    name: "Daily News",
    avatarUrl:
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=96&h=96&fit=crop&q=80",
    text: "Breaking: Shocking footage emerges from downtown protest rally...",
    media: {
      kind: "image" as const,
      src: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&auto=format&fit=crop&q=80",
      alt: "Crowd at an outdoor rally",
    },
    verdict: "AI_GENERATED",
    confidence: 96.2,
    type: "image",
  },
  {
    handle: "@tech_insider",
    name: "Tech Insider",
    avatarUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&q=80",
    text: "CEO confirms massive layoffs in leaked audio recording",
    media: {
      kind: "audio" as const,
      src: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&auto=format&fit=crop&q=80",
      alt: "Audio mixer and studio equipment",
    },
    verdict: "AI_GENERATED",
    confidence: 91.8,
    type: "audio",
  },
  {
    handle: "@worldphoto",
    name: "World Photography",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&q=80",
    text: "Stunning sunset captured over the Grand Canyon yesterday",
    media: {
      kind: "image" as const,
      src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80",
      alt: "Grand Canyon at sunset",
    },
    verdict: "HUMAN",
    confidence: 98.1,
    type: "image",
  },
];

const PERKS = [
  {
    icon: Scan,
    title: "Auto-Scan Feeds & Pages",
    description:
      "Runs on any site — Facebook, blogs, news, and more — with tailored scrapers on major feeds where layouts demand it.",
  },
  {
    icon: Eye,
    title: "Instant Verdicts",
    description:
      "Real-time AI/human verdicts overlaid on posts and media — no extra clicks.",
  },
  {
    icon: Zap,
    title: "One-Click Reveal",
    description: "Tap any flagged post for a full confidence breakdown and artifact attribution.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const tweetItem = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

function VerdictBadge({ verdict, confidence }: { verdict: string; confidence: number }) {
  const isAI = verdict === "AI_GENERATED";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
      style={{
        background: isAI
          ? "color-mix(in srgb, var(--color-warn) 14%, transparent)"
          : "color-mix(in srgb, var(--color-verified) 14%, transparent)",
        border: `1px solid ${
          isAI
            ? "color-mix(in srgb, var(--color-warn) 25%, transparent)"
            : "color-mix(in srgb, var(--color-verified) 25%, transparent)"
        }`,
        color: isAI ? "var(--color-warn)" : "var(--color-verified)",
      }}
    >
      <ShieldCheck size={11} />
      {isAI ? "AI" : "Human"} · {confidence}%
    </span>
  );
}

export default function ExtensionShowcase() {
  return (
    <section
      className="relative section-padding overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 30% 50%, var(--color-purple-glow), transparent 65%), " +
            "radial-gradient(ellipse 40% 40% at 75% 60%, var(--color-cyan-glow), transparent 65%)",
          opacity: 0.35,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <FadeInUp className="flex flex-col items-center text-center gap-4 mb-16">
          <span className="badge-glass">
            <AppWindow size={13} />
            Browser Extension
          </span>
          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span style={{ color: "var(--foreground)" }}>Find the truth </span>
            <span className="gradient-text">everywhere</span>
          </h2>
          <p
            className="text-base max-w-2xl leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            Our Chrome extension works on Facebook, generic pages, and anywhere you browse. It
            auto-scans posts, images, videos, audio, and text, and flags AI-generated content before
            you scroll past.
            No tab switching. No uploads. Just the truth, inline.
          </p>
        </FadeInUp>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Left: Mock Twitter feed with extension overlay */}
          <FadeInUp delay={0.1}>
            <div
              className="liquid-glass-card overflow-hidden"
              style={{ borderRadius: 20 }}
            >
              {/* Browser chrome bar */}
              <div
                className="flex items-center gap-3 px-5 py-3.5"
                style={{
                  borderBottom: "1px solid var(--glass-border-subtle)",
                  background: "var(--glass-bg)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
                </div>

                <div
                  className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: "var(--glass-bg-hover)",
                    border: "1px solid var(--glass-border-subtle)",
                    color: "var(--muted-foreground)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <X size={12} />
                  x.com/home
                </div>

                {/* Extension icon in toolbar */}
                <div
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold"
                  style={{
                    background: "color-mix(in srgb, var(--color-cyan) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-cyan) 22%, transparent)",
                    color: "var(--color-cyan)",
                  }}
                >
                  <ShieldCheck size={12} />
                  <span className="hidden sm:inline">GG</span>
                </div>
              </div>

              {/* Mock tweets */}
              <motion.div
                className="p-4 flex flex-col gap-0"
                variants={container}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
              >
                {MOCK_TWEETS.map((tweet, i) => (
                  <motion.div
                    key={tweet.handle}
                    variants={tweetItem}
                    className="flex gap-3 py-4"
                    style={{
                      borderBottom:
                        i < MOCK_TWEETS.length - 1
                          ? "1px solid var(--glass-border-subtle)"
                          : "none",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="relative w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"
                      style={{
                        border: "1px solid var(--glass-border-subtle)",
                      }}
                    >
                      <Image
                        src={tweet.avatarUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>

                    {/* Tweet body */}
                    <div className="flex-1 flex flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--foreground)" }}
                        >
                          {tweet.name}
                        </span>
                        <span
                          className="text-xs truncate"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {tweet.handle}
                        </span>
                      </div>

                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--foreground)", opacity: 0.85 }}
                      >
                        {tweet.text}
                      </p>

                      {/* Media preview (image or audio strip) */}
                      {tweet.media.kind === "image" && (
                        <div
                          className="relative w-full h-28 rounded-xl overflow-hidden"
                          style={{ border: "1px solid var(--glass-border-subtle)" }}
                        >
                          <Image
                            src={tweet.media.src}
                            alt={tweet.media.alt}
                            fill
                            sizes="(max-width: 1024px) 100vw, 480px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      {tweet.media.kind === "audio" && (
                        <div
                          className="relative w-full h-20 rounded-xl overflow-hidden"
                          style={{ border: "1px solid var(--glass-border-subtle)" }}
                        >
                          <Image
                            src={tweet.media.src}
                            alt={tweet.media.alt}
                            fill
                            sizes="(max-width: 1024px) 100vw, 480px"
                            className="object-cover"
                          />
                          <div
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            style={{
                              background:
                                "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--background) 35%, transparent) 50%, transparent 100%)",
                            }}
                          >
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                              style={{
                                background: "color-mix(in srgb, var(--background) 75%, transparent)",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              Audio clip
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Extension verdict overlay */}
                      <div className="flex items-center gap-2 pt-1">
                        <VerdictBadge
                          verdict={tweet.verdict}
                          confidence={tweet.confidence}
                        />
                        <span
                          className="text-[10px]"
                          style={{
                            color: "var(--muted-foreground)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {tweet.type}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </FadeInUp>

          {/* Right: perks + CTA */}
          <div className="flex flex-col gap-8">
            <FadeInUp delay={0.2}>
              <div className="flex flex-col gap-6">
                {PERKS.map((perk) => {
                  const Icon = perk.icon;
                  return (
                    <div key={perk.title} className="flex gap-4 items-start">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "color-mix(in srgb, var(--color-cyan) 10%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--color-cyan) 18%, transparent)",
                        }}
                      >
                        <Icon size={18} style={{ color: "var(--color-cyan)" }} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h3
                          className="text-[15px] font-semibold"
                          style={{
                            color: "var(--foreground)",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {perk.title}
                        </h3>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {perk.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FadeInUp>

            {/* Stats + CTA */}
            <FadeInUp delay={0.3}>
              <div
                className="liquid-glass-card p-5 flex flex-col gap-5"
                style={{ borderRadius: 16 }}
              >
                <div className="flex items-center gap-6 flex-wrap">
                  {[
                    { value: "100K+", label: "Posts scanned" },
                    { value: "<1s", label: "Per-item analysis" },
                    { value: "Free", label: "During beta" },
                  ].map((stat) => (
                    <div key={stat.label} className="flex flex-col gap-0.5">
                      <span
                        className="text-xl font-bold"
                        style={{
                          fontFamily: "var(--font-display)",
                          background: "linear-gradient(135deg, var(--color-purple), var(--color-cyan))",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {stat.value}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>

                <a
                  href="#"
                  className="btn-primary justify-center text-sm"
                  style={{ padding: "12px 24px", borderRadius: 12 }}
                >
                  <AppWindow size={15} />
                  Add to Chrome — It&apos;s Free
                  <ArrowRight size={14} />
                </a>
              </div>
            </FadeInUp>
          </div>
        </div>
      </div>
    </section>
  );
}
