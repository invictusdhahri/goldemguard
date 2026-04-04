"use client";

import { useRef, useEffect, useState } from "react";
import { type LucideProps, Cpu, CheckCircle2, AlertTriangle, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

interface Step {
  id: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  color: string;
  status: string;
}

const STEPS: Step[] = [
  {
    id: "upload",
    label: "Content Upload",
    sublabel: "Image / Video / Audio / Text",
    icon: Upload,
    color: "#00d4ff",
    status: "done",
  },
  {
    id: "primary",
    label: "Primary Model",
    sublabel: "SigLIP / GenConViT / AASIST3",
    icon: Cpu,
    color: "#8b5cf6",
    status: "active",
  },
  {
    id: "fallback",
    label: "Fallback Layer",
    sublabel: "Automatic on timeout / low confidence",
    icon: RotateCcw,
    color: "#f59e0b",
    status: "standby",
  },
  {
    id: "verdict",
    label: "Final Verdict",
    sublabel: "Confidence + attribution map",
    icon: ShieldCheck,
    color: "#10b981",
    status: "done",
  },
];

const FALLBACK_SCENARIOS = [
  { trigger: "Model timeout (>5s)", action: "Route to backup endpoint", outcome: "Verdict delivered" },
  { trigger: "Low confidence (<60%)", action: "Run secondary model", outcome: "Ensemble verdict" },
  { trigger: "API rate limit hit", action: "Queue + retry with fallback", outcome: "No dropped requests" },
];

export default function FallbackChain() {
  const [activeStep, setActiveStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [visible]);

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative py-28 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #07070e 0%, #0a0a12 50%, #07070e 100%)" }}
    >
      {/* Background accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 50% 40% at 20% 60%, rgba(0,212,255,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 40%, rgba(139,92,246,0.05) 0%, transparent 60%)
          `,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="flex flex-col items-center text-center gap-4 mb-16">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.2)",
              color: "#00d4ff",
            }}
          >
            Always-On Architecture
          </div>
          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight"
            style={{ color: "#e2e8f0", fontFamily: "var(--font-display)" }}
          >
            A Verdict,{" "}
            <span className="gradient-text-cyan">Every Single Time</span>
          </h2>
          <p className="text-base max-w-xl" style={{ color: "#64748b" }}>
            Our self-healing fallback architecture automatically reroutes to backup models
            so detection never fails — even when primary models are overloaded or uncertain.
          </p>
        </div>

        {/* Pipeline visualization */}
        <div className="glass-card rounded-2xl p-8 mb-10">
          {/* Desktop pipeline */}
          <div className="hidden md:flex items-center justify-between gap-2">
            {STEPS.map((step, i) => {
              const isActive = activeStep === i;
              const isPast = activeStep > i;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className="flex flex-col items-center gap-3 flex-shrink-0"
                    style={{ minWidth: "120px" }}
                  >
                    {/* Step circle */}
                    <div
                      className="relative w-14 h-14 rounded-xl flex items-center justify-center text-xl transition-all duration-500"
                      style={{
                        background: isActive
                          ? `${step.color}20`
                          : isPast
                          ? `${step.color}0d`
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? step.color + "50" : isPast ? step.color + "25" : "rgba(255,255,255,0.06)"}`,
                        boxShadow: isActive ? `0 0 20px ${step.color}30` : "none",
                        transform: isActive ? "scale(1.08)" : "scale(1)",
                      }}
                    >
                      <Icon
                        size={22}
                        style={{
                          color: isActive ? step.color : isPast ? step.color + "88" : "#475569",
                          transition: "color 0.5s ease",
                        }}
                      />

                      {isActive && (
                        <span
                          className="absolute inset-0 rounded-xl"
                          style={{
                            animation: "pulse-glow 1.5s ease-in-out infinite",
                            border: `1px solid ${step.color}`,
                            opacity: 0.4,
                          }}
                        />
                      )}
                    </div>

                    <div className="text-center">
                      <div
                        className="text-sm font-semibold mb-0.5"
                        style={{
                          color: isActive ? "#e2e8f0" : isPast ? "#94a3b8" : "#475569",
                          fontFamily: "var(--font-display)",
                          transition: "color 0.5s ease",
                        }}
                      >
                        {step.label}
                      </div>
                      <div className="text-xs" style={{ color: "#334155" }}>
                        {step.sublabel}
                      </div>
                    </div>

                    {/* Step indicator */}
                    {isPast && (
                      <CheckCircle2 size={14} style={{ color: step.color, opacity: 0.7 }} />
                    )}
                  </div>

                  {/* Connector */}
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 mx-4 flex flex-col items-center gap-1.5">
                      <div className="pipeline-line w-full" />
                      {i === 1 && (
                        <div
                          className="flex items-center gap-1 px-2 py-0.5 rounded"
                          style={{
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.2)",
                          }}
                        >
                          <AlertTriangle size={9} style={{ color: "#f59e0b" }} />
                          <span style={{ color: "#f59e0b", fontSize: "9px", fontFamily: "monospace" }}>
                            auto-fallback
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile pipeline (vertical) */}
          <div className="flex md:hidden flex-col gap-0">
            {STEPS.map((step, i) => {
              const isActive = activeStep === i;
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500"
                      style={{
                        background: isActive ? `${step.color}20` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isActive ? step.color + "50" : "rgba(255,255,255,0.06)"}`,
                        boxShadow: isActive ? `0 0 16px ${step.color}30` : "none",
                      }}
                    >
                      <Icon size={16} style={{ color: isActive ? step.color : "#475569" }} />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-px h-8 my-1" style={{ background: "rgba(0,212,255,0.15)" }} />
                    )}
                  </div>
                  <div className="pt-2 pb-6">
                    <div className="text-sm font-semibold" style={{ color: isActive ? "#e2e8f0" : "#64748b", fontFamily: "var(--font-display)" }}>
                      {step.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#334155" }}>{step.sublabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fallback scenarios */}
        <div
          className="grid md:grid-cols-3 gap-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s",
          }}
        >
          {FALLBACK_SCENARIOS.map((scenario, i) => (
            <div
              key={i}
              className="glass-card rounded-xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <span className="text-xs font-semibold" style={{ color: "#e2e8f0" }}>Trigger: </span>
                  <span className="text-xs" style={{ color: "#64748b" }}>{scenario.trigger}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <RotateCcw size={14} style={{ color: "#00d4ff", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <span className="text-xs font-semibold" style={{ color: "#e2e8f0" }}>Action: </span>
                  <span className="text-xs" style={{ color: "#64748b" }}>{scenario.action}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} style={{ color: "#10b981", flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <span className="text-xs font-semibold" style={{ color: "#e2e8f0" }}>Outcome: </span>
                  <span className="text-xs" style={{ color: "#10b981" }}>{scenario.outcome}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
