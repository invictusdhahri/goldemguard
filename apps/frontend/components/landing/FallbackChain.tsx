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
      "Submit any file type — image, video, audio, or document — via the REST API or web interface. No preprocessing required.",
    accentVar: "--color-cyan",
  },
  {
    number: "02",
    icon: Cpu,
    title: "Primary Detection",
    description:
      "Our specialized model for your content type runs an inference pass, analyzing semantic patterns and artifact signatures.",
    accentVar: "--color-purple",
  },
  {
    number: "03",
    icon: RotateCcw,
    title: "Auto-Fallback",
    description:
      "If the primary model times out or returns low confidence, the system automatically reroutes to a backup model. Zero dropped requests.",
    accentVar: "--color-warn",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Final Verdict",
    description:
      "Receive a confidence score, attribution map, and structured verdict in under 2 seconds. Always a result, always explainable.",
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

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <FadeInUp className="flex flex-col items-center text-center gap-4 mb-16">
          <span className="badge-glass">Always-On Architecture</span>
          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span style={{ color: "var(--foreground)" }}>A Verdict,</span>{" "}
            <span className="gradient-text">Every Single Time</span>
          </h2>
          <p className="text-base max-w-xl" style={{ color: "var(--muted-foreground)" }}>
            Self-healing fallback architecture automatically reroutes to backup models so detection never fails — even when primary models are overloaded.
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

        {/* Bottom stat strip */}
        <FadeInUp delay={0.4} className="mt-12">
          <div
            className="liquid-glass-card p-6 flex flex-wrap items-center justify-center gap-8"
          >
            {[
              { value: "99.9%", label: "Uptime SLA" },
              { value: "<2s", label: "Avg. verdict time" },
              { value: "0", label: "Dropped requests" },
              { value: "4", label: "Fallback layers" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1 px-4">
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: "var(--font-display)",
                    background: "linear-gradient(135deg, var(--color-purple), var(--color-cyan))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {item.value}
                </span>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
