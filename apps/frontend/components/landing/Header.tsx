"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ChevronRight, Menu, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ui/ThemeToggle";

type NavItem =
  | { label: string; sectionId: string }
  | { label: string; href: string };

const NAV_LINKS: NavItem[] = [
  { label: "Features", sectionId: "features" },
  { label: "How It Works", sectionId: "how-it-works" },
  { label: "Docs", href: "/docs" },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSectionNav =
    (sectionId: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname === "/") {
        e.preventDefault();
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }
    };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "fixed z-50 nav-transition",
          scrolled
            ? "nav-scrolled nav-floating rounded-2xl"
            : "bg-transparent rounded-none"
        )}
        style={{
          top: scrolled ? 12 : 0,
          left: scrolled ? "max(16px, calc(50% - 448px))" : 0,
          right: scrolled ? "max(16px, calc(50% - 448px))" : 0,
        }}
      >
        <nav
          className="mx-auto flex items-center justify-between gap-4 nav-transition"
          style={{
            height: scrolled ? 48 : 64,
            padding: scrolled ? "0 16px" : "0 20px",
            maxWidth: scrolled ? "none" : 1280,
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group flex-shrink-0"
            onClick={() => setMenuOpen(false)}
          >
            <div
              className={cn(
                "relative rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-105",
                scrolled ? "w-[26px] h-[26px]" : "w-[32px] h-[32px]"
              )}
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                boxShadow: "0 2px 8px var(--glass-shadow)",
              }}
            >
              <Shield
                size={scrolled ? 12 : 15}
                style={{ color: "var(--color-purple)", transition: "all 0.5s" }}
              />
            </div>
            <span
              className={cn(
                "font-bold tracking-tight transition-all duration-500",
                scrolled ? "text-[14px]" : "text-[16px]"
              )}
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--foreground)",
              }}
            >
              Gaulem<span style={{ color: "var(--color-purple)" }}>Guard</span>
            </span>
          </Link>

          {/* Desktop nav links — centered */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map((item) =>
              "href" in item ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "rounded-full font-medium transition-all duration-300 hover:bg-[var(--glass-bg)] hover:text-[var(--foreground)]",
                    scrolled ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                  )}
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href="/"
                  onClick={handleSectionNav(item.sectionId)}
                  className={cn(
                    "rounded-full font-medium transition-all duration-300 hover:bg-[var(--glass-bg)] hover:text-[var(--foreground)]",
                    scrolled ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                  )}
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {item.label}
                </a>
              )
            )}
          </div>

          {/* Right side: theme toggle + CTA */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <Link
              href="/login"
              className={cn(
                "btn-primary transition-all duration-500",
                scrolled ? "text-[12px]" : "text-[13px]"
              )}
              style={{ padding: scrolled ? "6px 14px" : "8px 18px" }}
            >
              Launch App <ChevronRight size={scrolled ? 11 : 13} />
            </Link>
          </div>

          {/* Mobile: theme toggle + burger */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="liquid-glass-button flex items-center justify-center transition-all duration-200"
              style={{ padding: "7px", width: "34px", height: "34px" }}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <X size={16} style={{ color: "var(--foreground)" }} />
              ) : (
                <Menu size={16} style={{ color: "var(--muted-foreground)" }} />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-all duration-300",
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMenuOpen(false)}
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed left-4 right-4 z-40 md:hidden transition-all duration-300 ease-out rounded-2xl overflow-hidden",
          scrolled ? "top-[68px]" : "top-[64px]",
          menuOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0 pointer-events-none"
        )}
        style={{
          background: "var(--nav-smoky-bg)",
          backdropFilter: "saturate(180%) blur(32px)",
          WebkitBackdropFilter: "saturate(180%) blur(32px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 16px 48px var(--glass-shadow)",
        }}
      >
        <div className="px-4 py-5 flex flex-col gap-1">
          {NAV_LINKS.map((item, i) =>
            "href" in item ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-[var(--glass-bg-hover)]"
                style={{
                  color: "var(--foreground)",
                  transitionDelay: `${i * 40}ms`,
                }}
              >
                {item.label}
                <ArrowRight size={14} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
              </Link>
            ) : (
              <a
                key={item.label}
                href="/"
                onClick={(e) => {
                  handleSectionNav(item.sectionId)(e);
                  setMenuOpen(false);
                }}
                className="flex items-center justify-between py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-[var(--glass-bg-hover)]"
                style={{
                  color: "var(--foreground)",
                  transitionDelay: `${i * 40}ms`,
                }}
              >
                {item.label}
                <ArrowRight size={14} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
              </a>
            )
          )}

          <div
            className="flex flex-col gap-2 pt-4 mt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <Link
              href="/login"
              className="btn-primary justify-center text-sm"
              style={{ padding: "11px", fontSize: "14px", borderRadius: "12px" }}
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
