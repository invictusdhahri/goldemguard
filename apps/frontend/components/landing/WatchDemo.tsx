"use client";

import FadeInUp from "./FadeInUp";

/** Served from `apps/frontend/public/goblenguard.mp4`. */
const DEMO_VIDEO_SRC = "/goblenguard.mp4";

export default function WatchDemo() {
  return (
    <section
      className="relative section-padding overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <FadeInUp>
          <div className="text-center mb-10">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
            >
              Watch Demo
            </h2>
            <p className="mt-3 text-base max-w-lg mx-auto" style={{ color: "var(--muted-foreground)" }}>
              See GolemGuard in action.
            </p>
          </div>

          <div
            className="relative aspect-video w-full rounded-2xl overflow-hidden"
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 12px 48px var(--glass-shadow)",
            }}
          >
            <video
              className="absolute inset-0 w-full h-full object-contain bg-black/30"
              controls
              playsInline
              preload="metadata"
            >
              <source src={DEMO_VIDEO_SRC} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
