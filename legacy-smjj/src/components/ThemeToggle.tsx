"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group flex w-full items-center gap-3 rounded-2xl border border-white/40 bg-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-700 shadow-inner shadow-white/40 transition hover:border-white/60 hover:bg-white/30 dark:border-white/10 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
    >
      <span className="relative flex h-10 w-20 items-center rounded-full bg-gradient-to-r from-slate-100 to-gray-200 p-1 transition dark:from-slate-700 dark:to-slate-800">
        <span
          className={`absolute inset-y-1 w-8 rounded-full bg-white shadow transition-all duration-300 dark:bg-black/60 ${
            isDark ? "translate-x-9" : "translate-x-0"
          }`}
        />
        <span
          className={`relative z-10 flex flex-1 items-center justify-center text-gray-500 transition ${
            !isDark ? "text-amber-500 drop-shadow" : ""
          }`}
        >
          <Sun size={16} />
        </span>
        <span
          className={`relative z-10 flex flex-1 items-center justify-center text-gray-500 transition ${
            isDark ? "text-sky-400 drop-shadow" : ""
          }`}
        >
          <Moon size={16} />
        </span>
      </span>
      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-200">
        {isDark ? "Mode Terang" : "Mode Gelap"}
      </span>
    </button>
  );
}
