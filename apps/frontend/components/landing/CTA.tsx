import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTA() {
  return (
    <section className="relative py-28 overflow-hidden" style={{ background: "#07070e" }}>
      {/* Glow orb */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, rgba(139,92,246,0.05) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div
          className="rounded-2xl p-12 lg:p-16"
          style={{
            background: "linear-gradient(135deg, rgba(13,13,26,0.95) 0%, rgba(18,18,32,0.9) 100%)",
            border: "1px solid rgba(0,212,255,0.12)",
            boxShadow: "0 0 80px rgba(0,212,255,0.06), inset 0 1px 0 rgba(0,212,255,0.08)",
          }}
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.2)",
              color: "#00d4ff",
            }}
          >
            Start for free · No credit card required
          </div>

          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight mb-4"
            style={{ color: "#e2e8f0", fontFamily: "var(--font-display)" }}
          >
            Ready to Expose{" "}
            <span className="gradient-text-cyan">AI-Generated Content</span>?
          </h2>

          <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: "#64748b" }}>
            Join the researchers, journalists, and enterprises who trust VeritasAI to
            distinguish real from generated.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="btn-primary text-base" style={{ padding: "14px 32px", fontSize: "16px" }}>
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link href="/docs" className="btn-ghost text-base" style={{ padding: "13px 32px", fontSize: "16px" }}>
              View Documentation
            </Link>
          </div>

          {/* Trust row */}
          <div
            className="flex items-center justify-center gap-8 mt-10 pt-8"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            {["SOC 2 Ready", "GDPR Compliant", "Zero Data Retention", "Open Source Models"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <span
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: "#00d4ff" }}
                />
                <span className="text-xs" style={{ color: "#475569" }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
