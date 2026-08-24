// components/ThemeToggle.tsx
"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useDarkMode } from "@/lib/useDarkMode";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { dark, toggleTheme } = useDarkMode();

  return (
    <Button
      variant="outline"
      size="icon-lg"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className="fixed right-5 bottom-5 rounded-xl bg-background/85 shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
