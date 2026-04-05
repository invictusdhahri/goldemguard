"use client";

import Link from "next/link";
import { Scan, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const FOOTER_LINKS = [
  { label: "Documentation", href: "/docs" },
  { label: "API Reference", href: "#" },
  { label: "Privacy Policy", href: "#" },
];

export default function Footer() {
  return (
    <footer className="relative py-10 bg-background">
      <Separator className="mb-10 opacity-40" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-7 h-7 rounded-lg flex items-center justify-center bg-cyan/10 border border-cyan/20 group-hover:bg-cyan/15 transition-colors">
              <Scan size={14} className="text-cyan" />
            </div>
            <span
              className="text-sm font-bold tracking-tight text-muted-foreground group-hover:text-foreground transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Veritas<span className="text-cyan">AI</span>
            </span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-1">
            {FOOTER_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
                >
                  {Icon && <Icon size={12} />}
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} VeritasAI
            </p>
            <Separator orientation="vertical" className="h-3 opacity-40" />
            <p className="text-xs text-muted-foreground/60">Built for truth.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
