"use client";

import { Play } from "lucide-react";
import FadeInUp from "./FadeInUp";

/** Set to e.g. `/demo.mp4` after adding the file under `apps/frontend/public/`. */
const DEMO_VIDEO_SRC: string | undefined = undefined;

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
              {DEMO_VIDEO_SRC ? <source src={DEMO_VIDEO_SRC} type="video/mp4" /> : null}
            </video>

            {!DEMO_VIDEO_SRC && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none"
                aria-hidden
              >
                <span
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border-subtle)",
                  }}
                >
                  <Play size={22} style={{ color: "var(--foreground)", marginLeft: "3px" }} />
                </span>
                <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Your video will play here
                </span>
              </div>
            )}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
