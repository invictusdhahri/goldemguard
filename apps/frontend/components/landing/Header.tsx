"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scan, ChevronRight, Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Models", href: "#models" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-background/85 backdrop-blur-xl border-b border-border shadow-lg shadow-black/20"
            : "bg-transparent"
        )}
      >
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMenuOpen(false)}>
            <div className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-cyan/10 border border-cyan/25 group-hover:bg-cyan/15 transition-colors">
              <Scan size={16} className="text-cyan" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan shadow-[0_0_6px_#00d4ff]" />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Veritas<span className="text-cyan">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/docs"
              className="btn-ghost text-sm"
              style={{ padding: "8px 18px", fontSize: "14px" }}
            >
              Documentation
            </Link>
            <Link
              href="/login"
              className="btn-primary text-sm flex items-center gap-1.5"
              style={{ padding: "8px 18px", fontSize: "14px" }}
            >
              Launch App
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className={cn(
              "md:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200",
              menuOpen
                ? "bg-cyan/10 border border-cyan/20 text-cyan"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>
      </header>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-all duration-300",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMenuOpen(false)}
        style={{ background: "rgba(7,7,14,0.6)", backdropFilter: "blur(4px)" }}
      />

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed top-16 left-0 right-0 z-40 md:hidden transition-all duration-300 ease-out",
          menuOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
        )}
        style={{ background: "rgba(7,7,14,0.98)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="px-6 py-6 flex flex-col gap-2">
          {NAV_LINKS.map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between py-3 px-4 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {item.label}
              <ArrowRight size={14} className="opacity-40" />
            </a>
          ))}

          <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-border">
            <Link
              href="/docs"
              className="btn-ghost text-center text-sm"
              style={{ padding: "11px", fontSize: "14px" }}
              onClick={() => setMenuOpen(false)}
            >
              Documentation
            </Link>
            <Link
              href="/login"
              className="btn-primary justify-center text-sm"
              style={{ padding: "11px", fontSize: "14px" }}
              onClick={() => setMenuOpen(false)}
            >
              Launch App <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
