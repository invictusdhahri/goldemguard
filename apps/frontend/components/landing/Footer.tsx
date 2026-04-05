"use client";

import Link from "next/link";
import { Shield, ExternalLink, MessageCircle } from "lucide-react";
import FadeInUp from "./FadeInUp";

const LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Status", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Security", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer
      className="relative pt-16 pb-8 overflow-hidden"
      style={{ background: "var(--background)", borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <FadeInUp>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            {/* Brand column */}
            <div className="col-span-2 flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2.5 group w-fit">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border-subtle)",
                  }}
                >
                  <Shield size={15} style={{ color: "var(--color-purple)" }} />
                </div>
                <span
                  className="text-[16px] font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}
                >
                  Gaulem<span style={{ color: "var(--color-purple)" }}>Guard</span>
                </span>
              </Link>

              <p className="text-sm max-w-[220px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                Multimodal AI-generated content detection. Guarding truth.
              </p>

              {/* Social icons */}
              <div className="flex items-center gap-2 mt-1">
                {[
                  { icon: ExternalLink, href: "#", label: "GitHub" },
                  { icon: MessageCircle, href: "#", label: "Twitter/X" },
                ].map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="liquid-glass-button"
                    style={{ padding: "7px", width: "32px", height: "32px", justifyContent: "center" }}
                  >
                    <Icon size={14} style={{ color: "var(--muted-foreground)" }} />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(LINKS).map(([group, items]) => (
              <div key={group} className="flex flex-col gap-3">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--foreground)", letterSpacing: "0.1em" }}
                >
                  {group}
                </span>
                <ul className="flex flex-col gap-2">
                  {items.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm transition-colors duration-200"
                        style={{ color: "var(--muted-foreground)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--foreground)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--muted-foreground)")}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FadeInUp>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
            © {new Date().getFullYear()} GaulemGuard. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)", opacity: 0.5 }}>
            Built for truth. Powered by AI.
          </p>
        </div>
      </div>
    </footer>
  );
}
