"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 94.4, suffix: "%", label: "Image detection accuracy", color: "#00d4ff", decimals: 1 },
  { value: 4,    suffix: "",  label: "Detection modalities",     color: "#8b5cf6", decimals: 0 },
  { value: 2,    suffix: "s", label: "Average response time",    color: "#10b981", decimals: 0, prefix: "<" },
  { value: 99.9, suffix: "%", label: "Uptime guarantee",         color: "#f59e0b", decimals: 1 },
];

function Counter({ value, suffix, decimals, prefix = "", color }: {
  value: number; suffix: string; decimals: number; prefix?: string; color: string;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1800;
    const steps = 60;
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
    <span
      ref={ref}
      className="text-4xl lg:text-5xl font-bold tabular-nums"
      style={{ color, fontFamily: "var(--font-display)" }}
    >
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
}

export default function Stats() {
  return (
    <section
      className="relative py-16 overflow-hidden"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Gradient stripe */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, rgba(0,212,255,0.03) 0%, rgba(139,92,246,0.04) 50%, rgba(0,212,255,0.03) 100%)",
          backgroundSize: "200% 100%",
          animation: "gradient-shift 8s ease infinite",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center gap-2"
            >
              <Counter
                value={stat.value}
                suffix={stat.suffix}
                decimals={stat.decimals}
                prefix={stat.prefix}
                color={stat.color}
              />
              <span className="text-sm" style={{ color: "#475569" }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
