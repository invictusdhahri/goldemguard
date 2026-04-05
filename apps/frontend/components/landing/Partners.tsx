"use client";

import FadeInUp from "./FadeInUp";

/** Services wired in production (see apps/backend/.env.example). */
const STACK = [
  "Supabase",
  "SightEngine",
  "xAI Grok",
  "Anthropic Claude",
  "Resemble",
  "Sapling",
] as const;

export default function Partners() {
  return (
    <section className="relative py-12 overflow-hidden" style={{ background: "var(--background)" }}>
      <FadeInUp className="text-center px-4 sm:px-6">
        <p
          className="text-sm font-medium uppercase tracking-widest mb-4"
          style={{ color: "var(--muted-foreground)", letterSpacing: "0.12em" }}
        >
          Integrations
        </p>
        <p className="text-sm max-w-xl mx-auto mb-6" style={{ color: "var(--muted-foreground)" }}>
          Auth, storage, and analysis — the APIs we run in production today.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {STACK.map((name) => (
            <span
              key={name}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border-subtle)",
                color: "var(--muted-foreground)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </FadeInUp>
    </section>
  );
}
