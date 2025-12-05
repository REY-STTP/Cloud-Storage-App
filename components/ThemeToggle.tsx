"use client";

import { useDarkMode } from "@/lib/useDarkMode";

export default function ThemeToggle() {
  const { dark, toggleTheme } = useDarkMode();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="
        fixed
        bottom-5 right-5
        w-12 h-12
        flex items-center justify-center
        rounded-full
        shadow-lg
        backdrop-blur-md
        bg-white/80 dark:bg-black/40
        border border-slate-300 dark:border-slate-700
        text-slate-700 dark:text-slate-200
        transition-all duration-300
        hover:scale-105 hover:shadow-xl
      "
    >
      <span className="text-xl">{dark ? "☀️" : "🌙"}</span>
    </button>
  );
}
