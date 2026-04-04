"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scan, ChevronRight, Menu, X } from "lucide-react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? "rgba(7, 7, 14, 0.85)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="relative w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #00d4ff22, #8b5cf622)", border: "1px solid rgba(0,212,255,0.3)" }}
          >
            <Scan size={16} style={{ color: "#00d4ff" }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
              style={{ background: "#00d4ff", boxShadow: "0 0 6px #00d4ff" }}
            />
          </div>
          <span
            className="text-[17px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "#e2e8f0" }}
          >
            Veritas<span style={{ color: "#00d4ff" }}>AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Features", href: "#features" },
            { label: "How It Works", href: "#how-it-works" },
            { label: "Models", href: "#models" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: "#94a3b8" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#e2e8f0")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#94a3b8")}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/docs"
            className="btn-ghost text-sm"
            style={{ padding: "8px 18px", fontSize: "14px" }}
          >
            Documentation
          </Link>
          <Link
            href="/dashboard"
            className="btn-primary text-sm"
            style={{ padding: "8px 18px", fontSize: "14px" }}
          >
            Launch App
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg"
          style={{ color: "#94a3b8" }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-4"
          style={{ background: "rgba(7,7,14,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {[
            { label: "Features", href: "#features" },
            { label: "How It Works", href: "#how-it-works" },
            { label: "Models", href: "#models" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium"
              style={{ color: "#94a3b8" }}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <Link href="/docs" className="btn-ghost text-center text-sm" style={{ padding: "10px", fontSize: "14px" }} onClick={() => setMenuOpen(false)}>
              Documentation
            </Link>
            <Link href="/dashboard" className="btn-primary justify-center text-sm" style={{ padding: "10px", fontSize: "14px" }}>
              Launch App <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
