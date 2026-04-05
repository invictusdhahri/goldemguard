import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import FadeInUp from "./FadeInUp";

const FREE_TRIAL_CREDITS = 25;

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    badge: "Trial",
    description:
      "Every account starts with trial credits. Each file analysis, Verify Chat run, or browser extension reveal uses one credit from the same pool.",
    cta: "Get started",
    href: "/login",
    primary: false,
    features: [
      `${FREE_TRIAL_CREDITS} trial credits on signup`,
      "Full detection stack on each use",
      "Dashboard & result history",
    ],
  },
  {
    name: "Pro",
    price: "$15",
    period: "/month",
    badge: "Popular",
    description: "Unlimited analyses and priority throughput for teams that verify content daily.",
    cta: "Upgrade (coming soon)",
    href: "/#pricing",
    primary: true,
    features: [
      "Unlimited credits (no per-use deduction)",
      "Higher rate limits",
      "Email support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    badge: null,
    description: "SSO, dedicated capacity, and custom integrations for newsrooms and platforms.",
    cta: "Contact sales",
    href: "/#pricing",
    primary: false,
    features: ["Everything in Pro", "SSO & audit logs", "Custom SLA"],
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="relative section-padding overflow-hidden scroll-mt-24"
      style={{ background: "var(--background)" }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(900px,100%)] h-[320px] pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center top, var(--color-cyan-glow), transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <FadeInUp>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="badge-glass inline-flex items-center gap-1.5 mb-4">
              <Sparkles size={12} style={{ color: "var(--color-cyan)" }} />
              Subscription & trial
            </span>
            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              One credit pool,{" "}
              <span className="gradient-text">every surface</span>
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Your free trial is not a time limit alone — it is a balance of credits shared across the web app and
              the extension. Uploading a file for deep analysis, running Verify Chat, or revealing a page in the
              extension each consumes one credit until the balance hits zero. Then you will see an upgrade prompt;
              paid plans remove the per-use limit.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="relative flex flex-col rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-1"
                style={{
                  background: tier.primary ? "var(--glass-bg)" : "var(--background)",
                  border: `1px solid ${tier.primary ? "var(--color-cyan)" : "var(--glass-border)"}`,
                  boxShadow: tier.primary
                    ? "0 12px 40px rgba(0,212,255,0.12), inset 0 1px 0 var(--glass-shine)"
                    : "0 8px 32px var(--glass-shadow)",
                  backdropFilter: tier.primary ? "blur(20px)" : undefined,
                }}
              >
                {tier.badge && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{
                      background: tier.primary ? "var(--color-cyan)" : "var(--muted)",
                      color: tier.primary ? "var(--background)" : "var(--foreground)",
                    }}
                  >
                    {tier.badge}
                  </span>
                )}

                <h3
                  className="text-lg font-semibold mb-1 mt-2"
                  style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
                >
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-4xl font-bold" style={{ color: "var(--foreground)" }}>
                    {tier.price}
                  </span>
                  {tier.period ? (
                    <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {tier.period}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: "var(--muted-foreground)" }}>
                  {tier.description}
                </p>

                <ul className="space-y-2.5 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--foreground)" }}>
                      <Check
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: tier.primary ? "var(--color-cyan)" : "var(--color-verified)" }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className={tier.primary ? "btn-primary text-center justify-center" : "btn-ghost text-center justify-center"}
                  style={{ padding: "12px 24px" }}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
