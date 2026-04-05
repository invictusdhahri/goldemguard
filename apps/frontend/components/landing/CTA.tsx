import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const TRUST_ITEMS = [
  "SOC 2 Ready",
  "GDPR Compliant",
  "Zero Data Retention",
  "Open Source Models",
];

export default function CTA() {
  return (
    <section className="relative py-28 overflow-hidden bg-background">
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
          className="rounded-2xl p-10 lg:p-16 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(13,13,26,0.95) 0%, rgba(18,18,32,0.9) 100%)",
            border: "1px solid rgba(0,212,255,0.12)",
            boxShadow: "0 0 80px rgba(0,212,255,0.06), inset 0 1px 0 rgba(0,212,255,0.08)",
          }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/30 to-transparent" />

          <div className="flex justify-center mb-6">
            <Badge variant="cyan" className="py-1.5 px-4 text-xs gap-2">
              <ShieldCheck size={12} />
              Start for free · No credit card required
            </Badge>
          </div>

          <h2
            className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ready to Expose{" "}
            <span className="gradient-text-cyan">AI-Generated Content</span>?
          </h2>

          <p className="text-base mb-10 max-w-xl mx-auto text-muted-foreground">
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
          <div className="flex items-center justify-center gap-6 mt-10 pt-8 flex-wrap">
            <Separator className="hidden sm:block absolute left-6 right-6" style={{ top: "auto", bottom: "auto" }} />
            <div className="flex items-center justify-center gap-6 flex-wrap border-t border-border w-full pt-8">
              {TRUST_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full flex-shrink-0 bg-cyan" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
