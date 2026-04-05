"use client";

import { motion } from "framer-motion";
import { Upload, Cpu, RotateCcw, ShieldCheck } from "lucide-react";
import FadeInUp from "./FadeInUp";

const STEPS = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Content",
    description:
      "Submit image, video, audio, or document via the REST API or web app. Files land in private Supabase Storage; a BullMQ job picks up the work.",
    accentVar: "--color-cyan",
  },
  {
    number: "02",
    icon: Cpu,
    title: "Multi-signal detection",
    description:
      "The worker runs the right third-party APIs for the modality—e.g. SightEngine + Grok + Claude for images, Resemble for audio, Sapling for documents.",
    accentVar: "--color-purple",
  },
  {
    number: "03",
    icon: RotateCcw,
    title: "Fusion & skips",
    description:
      "Scores are merged with a documented policy. If an API key is missing or a call fails, that step is skipped and recorded—so you always get a traceable outcome.",
    accentVar: "--color-warn",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Final verdict",
    description:
      "Structured result: verdict class, confidence, explanation, per-model evidence, and optional caveat—ready for the dashboard or extension.",
    accentVar: "--color-verified",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const stepItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

export default function FallbackChain() {
  return (
    <section
      id="how-it-works"
      className="relative section-padding overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 20% 50%, var(--color-purple-glow), transparent 60%), " +
            "radial-gradient(ellipse 40% 50% at 80% 50%, var(--color-cyan-glow), transparent 60%)",
          opacity: 0.35,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <FadeInUp className="flex flex-col items-center text-center gap-4 mb-10 sm:mb-16">
          <span className="badge-glass">Always-On Architecture</span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-balance px-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span style={{ color: "var(--foreground)" }}>A Verdict,</span>{" "}
            <span className="gradient-text">Every Single Time</span>
          </h2>
          <p className="text-sm sm:text-base max-w-xl text-pretty" style={{ color: "var(--muted-foreground)" }}>
            Defense in depth: multiple commercial APIs per modality, explicit fusion, and transparent skip reasons—built for demos you can defend in review.
          </p>
        </FadeInUp>

        {/* Steps */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.number} variants={stepItem} className="relative">
                {/* Connector line on desktop */}
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-8 left-[calc(50%+32px)] right-0 h-px z-0"
                    style={{
                      background: "linear-gradient(to right, var(--border), transparent)",
                    }}
                  />
                )}

                <div className="liquid-glass-card p-6 flex flex-col gap-4 h-full relative z-10">
                  {/* Number + icon */}
                  <div className="flex items-start justify-between">
                    {/* Icon circle */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `color-mix(in srgb, var(${step.accentVar}) 12%, transparent)`,
                        border: `1px solid color-mix(in srgb, var(${step.accentVar}) 22%, transparent)`,
                      }}
                    >
                      <Icon size={22} style={{ color: `var(${step.accentVar})` }} />
                    </div>

                    {/* Step number */}
                    <span
                      className="text-4xl font-bold opacity-15 select-none"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: `var(${step.accentVar})`,
                        lineHeight: 1,
                      }}
                    >
                      {step.number}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-2">
                    <h3
                      className="font-semibold text-[15px]"
                      style={{ color: "var(--foreground)", fontFamily: "var(--font-display)" }}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                      {step.description}
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div
                    className="mt-auto h-px rounded-full"
                    style={{
                      background: `linear-gradient(to right, var(${step.accentVar}), transparent)`,
                      opacity: 0.4,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
