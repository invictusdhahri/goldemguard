"use client";

import { Scan } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="relative py-12"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "#07070e",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="relative w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(139,92,246,0.15))",
                border: "1px solid rgba(0,212,255,0.2)",
              }}
            >
              <Scan size={14} style={{ color: "#00d4ff" }} />
            </div>
            <span
              className="text-sm font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "#64748b" }}
            >
              Veritas<span style={{ color: "#00d4ff" }}>AI</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            {[
              { label: "Documentation", href: "/docs" },
              { label: "API Reference", href: "#" },
              { label: "Privacy Policy", href: "#" },
              { label: "GitHub", href: "#" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs transition-colors duration-200"
                style={{ color: "#64748b" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#94a3b8")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#64748b")}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-xs" style={{ color: "#475569" }}>
            © 2024 VeritasAI. Built for truth.
          </p>
        </div>
      </div>
    </footer>
  );
}
