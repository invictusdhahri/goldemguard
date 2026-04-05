"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Moon, Sun, ShieldCheck, Zap, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import GuardVillager from "./GuardVillager";

function VillagerNightDecor() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || resolvedTheme !== "dark") return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible z-0"
      aria-hidden
    >
      <Moon
        className="absolute -right-1 top-6 h-9 w-9 text-amber-200/80"
        strokeWidth={1.35}
      />
      <span
        className="absolute -right-3 top-[5.25rem] h-2 w-2 rounded-full bg-amber-100/75 shadow-[0_0_10px_rgba(253,230,138,0.55)]"
      />
      <span
        className="absolute right-8 top-2 h-1.5 w-1.5 rounded-full bg-amber-100/60 shadow-[0_0_8px_rgba(253,230,138,0.45)]"
      />
      <span
        className="absolute -left-2 top-14 h-1.5 w-1.5 rounded-full bg-amber-100/55 shadow-[0_0_8px_rgba(253,230,138,0.4)]"
      />
      <span
        className="absolute left-4 top-24 h-1 w-1 rounded-full bg-amber-100/50 shadow-[0_0_6px_rgba(253,230,138,0.35)]"
      />
    </div>
  );
}

function VillagerLightDecor() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || resolvedTheme !== "light") return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-visible z-0"
      aria-hidden
    >
      <Sun
        className="absolute -right-1 top-6 h-9 w-9 text-amber-500/90"
        strokeWidth={1.35}
      />
      <span
        className="absolute -right-3 top-[5.25rem] h-2 w-2 rounded-full bg-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
      />
      <span
        className="absolute right-8 top-2 h-1.5 w-1.5 rounded-full bg-amber-300/55 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
      />
      <span
        className="absolute -left-2 top-14 h-1.5 w-1.5 rounded-full bg-amber-300/45 shadow-[0_0_8px_rgba(251,191,36,0.35)]"
      />
      <span
        className="absolute left-4 top-24 h-1 w-1 rounded-full bg-amber-200/50 shadow-[0_0_6px_rgba(251,191,36,0.3)]"
      />
    </div>
  );
}

const STATS = [
  { value: 94.4, suffix: "%", label: "Detection accuracy", decimals: 1 },
  { value: 4, suffix: "", label: "AI modalities", decimals: 0 },
  { value: 2, suffix: "s", label: "Avg. response", decimals: 0, prefix: "<" },
];

function Counter({
  value,
  suffix,
  decimals,
  prefix = "",
}: {
  value: number;
  suffix: string;
  decimals: number;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1600;
    const steps = 50;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, value);
      setCount(current);
      if (current >= value) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, value]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
}

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Zero data retention" },
  { icon: Zap, label: "Real-time detection" },
  { icon: Globe, label: "REST API ready" },
];

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center pt-[64px] overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-20">
        <div className="flex items-center gap-12 lg:gap-20">
          {/* Left — text content */}
          <div className="flex-1 flex flex-col gap-7">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="self-start"
            >
              <span className="badge-glass">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{
                    background: "var(--color-cyan)",
                    boxShadow: "0 0 6px var(--color-cyan-glow)",
                    animation: "pulse-glow 2s ease-in-out infinite",
                  }}
                />
                Multimodal AI Detection Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.21, 0.47, 0.32, 0.98] as const }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span style={{ color: "var(--foreground)" }}>Detect AI Content</span>
              <br />
              <span className="gradient-text">Before It Deceives</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-lg leading-relaxed max-w-xl"
              style={{ color: "var(--muted-foreground)" }}
            >
              GolemGuard deploys four specialized detection models — across images, video, audio, and documents — with a self-healing fallback architecture that{" "}
              <span style={{ color: "var(--foreground)", fontWeight: 500 }}>always delivers a verdict</span>.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="flex items-center gap-3 flex-wrap"
            >
              <Link href="/login" className="btn-primary" style={{ padding: "13px 28px", fontSize: "15px" }}>
                Start Detecting <ArrowRight size={16} />
              </Link>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
              className="flex items-center gap-8 sm:gap-10 pt-2"
            >
              {STATS.map((stat, i) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <span
                    className="text-3xl sm:text-4xl font-bold tabular-nums"
                    style={{
                      fontFamily: "var(--font-display)",
                      background:
                        i === 0
                          ? "linear-gradient(135deg, var(--color-purple), var(--color-cyan))"
                          : i === 1
                          ? "linear-gradient(135deg, var(--color-cyan), var(--color-purple))"
                          : "linear-gradient(135deg, var(--color-verified), var(--color-cyan))",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    <Counter
                      value={stat.value}
                      suffix={stat.suffix}
                      decimals={stat.decimals}
                      prefix={stat.prefix}
                    />
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.55 }}
              className="flex items-center gap-5 flex-wrap"
            >
              {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon size={12} style={{ color: "var(--muted-foreground)", opacity: 0.6 }} />
                  <span className="text-xs" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
                    {label}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Guard Villager character (+ sun in light mode, moon & stars in dark) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.21, 0.47, 0.32, 0.98] as const }}
            className="hidden lg:flex items-center justify-center flex-shrink-0 relative w-[200px] min-h-[280px]"
            style={{ animation: "float 6s ease-in-out infinite" }}
          >
            <VillagerLightDecor />
            <VillagerNightDecor />
            <div className="relative z-10">
              <GuardVillager />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
      />
    </section>
  );
}
