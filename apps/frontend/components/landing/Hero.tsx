"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, ShieldCheck, Zap, Globe } from "lucide-react";

const SCAN_LABELS = [
  { label: "Image Analyzed", color: "#00d4ff", x: "8%", y: "18%", delay: "1.2s" },
  { label: "AI Artifact: GAN Fingerprint", color: "#f43f5e", x: "55%", y: "32%", delay: "2.0s" },
  { label: "Confidence: 97.3%", color: "#10b981", x: "12%", y: "68%", delay: "2.8s" },
];

function ScannerPanel() {
  const [phase, setPhase] = useState<"scanning" | "verdict">("scanning");
  const [progress, setProgress] = useState(0);
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setPhase("verdict");
          setShowLabels(true);
          setTimeout(() => {
            setPhase("scanning");
            setProgress(0);
            setShowLabels(false);
          }, 4000);
          return 100;
        }
        return p + 1.2;
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #0d0d1a 0%, #121220 100%)",
        border: "1px solid rgba(0,212,255,0.15)",
        boxShadow: "0 0 60px rgba(0,212,255,0.08), 0 40px 80px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f43f5e" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#10b981" }} />
        </div>
        <span className="text-xs font-mono" style={{ color: "#475569" }}>
          veritas-scanner v2.4.1
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: phase === "scanning" ? "#00d4ff" : "#10b981",
              boxShadow: `0 0 6px ${phase === "scanning" ? "#00d4ff" : "#10b981"}`,
              animation: "pulse-glow 2s ease-in-out infinite",
            }}
          />
          <span className="text-xs font-mono" style={{ color: phase === "scanning" ? "#00d4ff" : "#10b981" }}>
            {phase === "scanning" ? "SCANNING" : "COMPLETE"}
          </span>
        </div>
      </div>

      {/* Scanner viewport */}
      <div className="relative scan-container" style={{ height: "260px" }}>
        {/* Faux image — abstract AI art pattern */}
        <div
          className="absolute inset-0 bg-grid-sm"
          style={{
            background: `
              radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.15) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 60%, rgba(0,212,255,0.1) 0%, transparent 50%),
              #0a0a14
            `,
          }}
        />

        {/* Abstract "face" shapes suggesting a portrait */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 260">
          <ellipse cx="200" cy="110" rx="70" ry="85" fill="none" stroke="#8b5cf6" strokeWidth="0.5" />
          <ellipse cx="175" cy="95" rx="12" ry="8" fill="#8b5cf6" opacity="0.3" />
          <ellipse cx="225" cy="95" rx="12" ry="8" fill="#8b5cf6" opacity="0.3" />
          <path d="M175 130 Q200 145 225 130" fill="none" stroke="#8b5cf6" strokeWidth="1" />
          <line x1="100" y1="0" x2="300" y2="260" stroke="#00d4ff" strokeWidth="0.3" opacity="0.3" />
          <line x1="0" y1="130" x2="400" y2="130" stroke="#00d4ff" strokeWidth="0.3" opacity="0.3" />
          {[...Array(6)].map((_, i) => (
            <circle key={i} cx={60 + i * 60} cy={20 + (i % 2) * 220} r="2" fill="#00d4ff" opacity="0.4" />
          ))}
        </svg>

        {/* Scan line */}
        {phase === "scanning" && <div className="scan-line" />}

        {/* Detection boxes */}
        {showLabels && (
          <>
            <div
              className="absolute"
              style={{
                top: "15%", left: "35%", width: "30%", height: "55%",
                border: "1px solid #f43f5e",
                boxShadow: "0 0 12px rgba(244,63,94,0.3)",
                animation: "reveal-up 0.4s ease forwards",
              }}
            >
              <span
                className="absolute -top-5 left-0 text-xs font-mono px-1.5 py-0.5 rounded"
                style={{ background: "#f43f5e", color: "#fff", fontSize: "10px" }}
              >
                AI GENERATED
              </span>
            </div>
            <div
              className="absolute"
              style={{
                top: "55%", left: "10%", width: "20%", height: "20%",
                border: "1px solid #00d4ff",
                boxShadow: "0 0 10px rgba(0,212,255,0.3)",
                animation: "reveal-up 0.4s ease 0.3s forwards",
                opacity: 0,
              }}
            />
          </>
        )}

        {/* Floating info badges */}
        {showLabels && SCAN_LABELS.map((item, i) => (
          <div
            key={i}
            className="absolute flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{
              top: item.y, left: item.x,
              background: "rgba(7,7,14,0.9)",
              border: `1px solid ${item.color}44`,
              boxShadow: `0 0 10px ${item.color}22`,
              animation: `reveal-up 0.5s ease ${item.delay} forwards`,
              opacity: 0,
              fontSize: "10px",
              fontFamily: "monospace",
              color: item.color,
              whiteSpace: "nowrap",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: item.color, boxShadow: `0 0 4px ${item.color}` }}
            />
            {item.label}
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div
        className="px-4 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono" style={{ color: "#475569" }}>
            {phase === "scanning" ? "Analyzing patterns..." : "Analysis complete"}
          </span>
          <span className="text-xs font-mono" style={{ color: "#00d4ff" }}>
            {Math.min(100, Math.round(progress))}%
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: phase === "verdict"
                ? "linear-gradient(90deg, #10b981, #00d4ff)"
                : "linear-gradient(90deg, #00d4ff, #8b5cf6)",
              boxShadow: "0 0 8px rgba(0,212,255,0.5)",
            }}
          />
        </div>

        {phase === "verdict" && (
          <div
            className="flex items-center justify-between mt-3 pt-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: "#64748b" }}>VERDICT</span>
              <span
                className="text-xs font-bold font-mono px-2 py-0.5 rounded"
                style={{ background: "rgba(244,63,94,0.15)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.3)" }}
              >
                AI GENERATED
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono" style={{ color: "#64748b" }}>Model:</span>
              <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>SigLIP v1</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <section
      className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-grid"
      style={{ background: "#07070e" }}
    >
      {/* Background blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 20%, rgba(0,212,255,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(139,92,246,0.03) 0%, transparent 70%)
          `,
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none bg-grid"
        style={{ maskImage: "radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <div
            className="flex flex-col gap-6"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 self-start">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: "rgba(0,212,255,0.08)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  color: "#00d4ff",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#00d4ff", animation: "pulse-glow 2s ease-in-out infinite" }}
                />
                Multimodal AI Detection Platform
              </div>
            </div>

            {/* Headline */}
            <h1
              className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span style={{ color: "#e2e8f0" }}>Detect AI Content</span>
              <br />
              <span className="gradient-text-cyan">Before It Deceives</span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg leading-relaxed max-w-xl"
              style={{ color: "#64748b" }}
            >
              VeritasAI deploys four specialized detection models — across images, video, audio, and documents —
              with a self-healing fallback architecture that{" "}
              <span style={{ color: "#94a3b8" }}>always delivers a verdict</span>.
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-6 pt-2">
              {[
                { value: "94.4%", label: "Image accuracy", color: "#00d4ff" },
                { value: "4", label: "Detection modalities", color: "#8b5cf6" },
                { value: "<2s", label: "Avg. response time", color: "#10b981" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col gap-0.5">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: stat.color, fontFamily: "var(--font-display)" }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-4 pt-2">
              <Link href="/upload" className="btn-primary">
                Start Detecting
                <ArrowRight size={16} />
              </Link>
              <button className="btn-ghost flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <Play size={10} style={{ color: "#e2e8f0", marginLeft: "1px" }} />
                </div>
                Watch Demo
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-4 pt-2">
              {[
                { icon: ShieldCheck, label: "Zero data retention" },
                { icon: Zap, label: "Real-time detection" },
                { icon: Globe, label: "REST API ready" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon size={13} style={{ color: "#475569" }} />
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Scanner panel */}
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(32px)",
              transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
            }}
          >
            <ScannerPanel />

            {/* Floating accuracy card */}
            <div
              className="absolute -bottom-6 -left-6 hidden lg:flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: "rgba(13,13,26,0.95)",
                border: "1px solid rgba(16,185,129,0.2)",
                boxShadow: "0 0 20px rgba(16,185,129,0.1)",
                backdropFilter: "blur(10px)",
                animation: "float 5s ease-in-out infinite",
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(16,185,129,0.15)" }}
              >
                <ShieldCheck size={16} style={{ color: "#10b981" }} />
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: "#10b981" }}>Verified Authentic</div>
                <div className="text-xs" style={{ color: "#475569" }}>Human-created content</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #07070e)" }}
      />
    </section>
  );
}
