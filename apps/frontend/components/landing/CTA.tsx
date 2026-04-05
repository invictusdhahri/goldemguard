import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import FadeInUp from "./FadeInUp";

const TRUST_ITEMS = ["SOC 2 Ready", "GDPR Compliant", "Zero Data Retention", "Open Source Models"];

export default function CTA() {
  return (
    <section
      className="relative section-padding overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, var(--color-purple-glow) 0%, var(--color-cyan-glow) 40%, transparent 75%)",
          filter: "blur(48px)",
          opacity: 0.5,
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <FadeInUp>
          {/* Liquid glass card */}
          <div
            className="relative overflow-hidden rounded-3xl p-10 lg:p-14"
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid var(--glass-border)",
              boxShadow:
                "0 12px 48px var(--glass-shadow), inset 0 1px 0 var(--glass-shine)",
            }}
          >
            {/* Top shimmer line */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(to right, transparent, var(--color-purple), var(--color-cyan), transparent)",
                opacity: 0.6,
              }}
            />

            {/* Badge */}
            <div className="flex justify-center mb-6">
              <span className="badge-glass">
                <ShieldCheck size={12} style={{ color: "var(--color-verified)" }} />
                Start free · No credit card required
              </span>
            </div>

            <h2
              className="text-4xl lg:text-5xl font-bold tracking-tight mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              Ready to Expose{" "}
              <span className="gradient-text">AI-Generated Content</span>?
            </h2>

            <p className="text-base mb-10 max-w-lg mx-auto" style={{ color: "var(--muted-foreground)" }}>
              Join researchers, journalists, and enterprises who trust GolemGuard to distinguish real from generated.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/login" className="btn-primary" style={{ padding: "14px 32px", fontSize: "16px" }}>
                Get Started Free <ArrowRight size={17} />
              </Link>
              <Link href="/docs" className="btn-ghost" style={{ padding: "13px 32px", fontSize: "16px" }}>
                View Documentation
              </Link>
            </div>

            {/* Trust row */}
            <div
              className="flex items-center justify-center gap-5 flex-wrap mt-10 pt-8"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              {TRUST_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: "var(--color-cyan)" }}
                  />
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
