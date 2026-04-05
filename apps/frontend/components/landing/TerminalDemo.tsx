"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import FadeInUp from "./FadeInUp";

interface CodeLine {
  text: string;
  type: "comment" | "keyword" | "string" | "function" | "normal" | "output" | "blank";
}

const TABS = [
  {
    id: "install",
    label: "install",
    lines: [
      { text: "# Install the GolemGuard SDK", type: "comment" },
      { text: "", type: "blank" },
      { text: "npm install @golem/sdk", type: "normal" },
      { text: "", type: "blank" },
      { text: "# Or with pnpm", type: "comment" },
      { text: "pnpm add @golem/sdk", type: "normal" },
      { text: "", type: "blank" },
      { text: "✓ Installed @golem/sdk@2.4.1", type: "output" },
      { text: "✓ Ready to detect AI content", type: "output" },
    ] as CodeLine[],
  },
  {
    id: "detect",
    label: "detect.ts",
    lines: [
      { text: "import { GolemGuard } from '@golem/sdk';", type: "normal" },
      { text: "", type: "blank" },
      { text: "const guard = new GolemGuard({", type: "normal" },
      { text: "  apiKey: process.env.GOLEM_KEY,", type: "normal" },
      { text: "});", type: "normal" },
      { text: "", type: "blank" },
      { text: "// Detect AI-generated content", type: "comment" },
      { text: "const result = await guard.detect({", type: "normal" },
      { text: "  file: imageBuffer,", type: "normal" },
      { text: "  modality: 'image',", type: "string" },
      { text: "});", type: "normal" },
      { text: "", type: "blank" },
      { text: "console.log(result.verdict);", type: "function" },
    ] as CodeLine[],
  },
  {
    id: "response",
    label: "response",
    lines: [
      { text: "{", type: "normal" },
      { text: '  "verdict": "AI_GENERATED",', type: "string" },
      { text: '  "confidence": 0.87,', type: "normal" },
      { text: '  "models_run": ["sightengine", "grok", "claude"],', type: "string" },
      { text: '  "modality": "image",', type: "string" },
      { text: '  "latency_ms": 1847,', type: "normal" },
      { text: '  "model_evidence": {', type: "normal" },
      { text: '    "sightengine": { "raw_score": 0.82 },', type: "normal" },
      { text: '    "grok": { "assessment": "likely_ai" }', type: "normal" },
      { text: "  }", type: "normal" },
      { text: "}", type: "normal" },
    ] as CodeLine[],
  },
];

const LINE_COLORS: Record<CodeLine["type"], string> = {
  comment: "var(--muted-foreground)",
  keyword: "#a78bfa",
  string: "#34d399",
  function: "#06b6d4",
  normal: "var(--foreground)",
  output: "#10b981",
  blank: "transparent",
};

export default function TerminalDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentLines = TABS[activeTab].lines;

  useEffect(() => {
    setVisibleLines(0);
    setCharIdx(0);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setVisibleLines((v) => {
        if (v >= currentLines.length) {
          clearInterval(intervalRef.current!);
          return v;
        }
        return v + 1;
      });
    }, 80);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTab, currentLines.length]);

  return (
    <section
      className="relative section-padding overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 60% at 50% 50%, var(--color-cyan-glow), transparent 70%)",
          opacity: 0.35,
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Section header */}
        <FadeInUp className="flex flex-col items-center text-center gap-4 mb-14">
          <span className="badge-glass">Developer Experience</span>
          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span style={{ color: "var(--foreground)" }}>Integrate in</span>{" "}
            <span className="gradient-text-cyan">Minutes</span>
          </h2>
          <p className="text-base max-w-xl" style={{ color: "var(--muted-foreground)" }}>
            A single SDK, one API call. Detection across every modality with a consistent response schema.
          </p>
        </FadeInUp>

        {/* Terminal window */}
        <FadeInUp delay={0.15}>
          <motion.div
            className="liquid-glass-card overflow-hidden"
            style={{ borderRadius: "20px" }}
          >
            {/* Title bar */}
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{
                borderBottom: "1px solid var(--glass-border-subtle)",
                background: "var(--glass-bg)",
              }}
            >
              {/* Traffic lights */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 flex-1 ml-2">
                {TABS.map((tab, i) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(i)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: activeTab === i ? "var(--glass-bg-hover)" : "transparent",
                      border: activeTab === i ? "1px solid var(--glass-border)" : "1px solid transparent",
                      color: activeTab === i ? "var(--foreground)" : "var(--muted-foreground)",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Status dot */}
              <span
                className="flex items-center gap-1.5 text-xs"
                style={{ fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "var(--color-verified)",
                    boxShadow: "0 0 6px var(--color-cyan-glow)",
                    animation: "pulse-glow 2s ease-in-out infinite",
                  }}
                />
                ready
              </span>
            </div>

            {/* Code body */}
            <div
              className="p-6 min-h-[280px] overflow-x-auto"
              style={{ fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.7" }}
            >
              {/* Line numbers + code */}
              {currentLines.slice(0, visibleLines).map((line, i) => (
                <div key={`${activeTab}-${i}`} className="flex items-start gap-4 group">
                  <span
                    className="select-none w-5 text-right flex-shrink-0 opacity-30 text-xs mt-0.5"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {line.type === "blank" ? "" : i + 1}
                  </span>
                  <span
                    className="flex-1"
                    style={{ color: LINE_COLORS[line.type] }}
                  >
                    {line.text || " "}
                    {/* Cursor on last visible line */}
                    {i === visibleLines - 1 && visibleLines < currentLines.length && (
                      <span
                        className="inline-block w-[7px] h-[14px] ml-0.5 align-middle rounded-sm"
                        style={{
                          background: "var(--color-cyan)",
                          animation: "blink 1s step-end infinite",
                          verticalAlign: "text-bottom",
                        }}
                      />
                    )}
                  </span>
                </div>
              ))}
              {/* Final cursor when done */}
              {visibleLines >= currentLines.length && (
                <div className="flex items-start gap-4 mt-1">
                  <span className="select-none w-5 opacity-30 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {currentLines.length + 1}
                  </span>
                  <span>
                    <span
                      className="inline-block w-[7px] h-[14px] rounded-sm"
                      style={{
                        background: "var(--color-cyan)",
                        animation: "blink 1s step-end infinite",
                        verticalAlign: "text-bottom",
                      }}
                    />
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </FadeInUp>
      </div>
    </section>
  );
}
