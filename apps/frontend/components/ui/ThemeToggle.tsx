"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="w-9 h-9 rounded-full liquid-glass-button flex items-center justify-center"
        style={{ padding: 0 }}
        aria-label="Toggle theme"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const icon = theme === "system" ? Monitor : isDark ? Moon : Sun;
  const Icon = icon;

  return (
    <button
      onClick={cycleTheme}
      className="liquid-glass-button"
      style={{ padding: "8px", width: "36px", height: "36px", justifyContent: "center" }}
      aria-label={`Switch theme (current: ${theme})`}
      title={`Theme: ${theme}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          <Icon size={15} style={{ color: "var(--muted-foreground)" }} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
