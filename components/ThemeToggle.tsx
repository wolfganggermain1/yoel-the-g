"use client";

import { useEffect, useState } from "react";

type Theme = "blue-light" | "blue-dark" | "red-light" | "red-dark";

const THEMES: { id: Theme; label: string; icon: string; color: string }[] = [
  { id: "blue-light", label: "Blue Light", icon: "\u2600\uFE0F", color: "#3b82f6" },
  { id: "blue-dark", label: "Blue Dark", icon: "\uD83C\uDF19", color: "#60a5fa" },
  { id: "red-light", label: "Red Light", icon: "\u2600\uFE0F", color: "#ef4444" },
  { id: "red-dark", label: "Red Dark", icon: "\uD83C\uDF19", color: "#f87171" },
];

export default function ThemeToggle() {
  const [active, setActive] = useState<Theme>("blue-light");

  useEffect(() => {
    // Read initial theme from the HTML element (set by the inline script in layout)
    const stored =
      (document.documentElement.getAttribute("data-theme") as Theme) ||
      (localStorage.getItem("theme") as Theme) ||
      "blue-light";
    setActive(stored);
  }, []);

  function applyTheme(theme: Theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    setActive(theme);

    // Also update the meta theme-color for mobile browsers
    const metaColor = document.querySelector('meta[name="theme-color"]');
    if (metaColor) {
      const colors: Record<Theme, string> = {
        "blue-light": "#f0f7ff",
        "blue-dark": "#0f172a",
        "red-light": "#fff5f5",
        "red-dark": "#1a0a0a",
      };
      metaColor.setAttribute("content", colors[theme]);
    }
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {THEMES.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => applyTheme(t.id)}
            aria-label={`Switch to ${t.label} theme`}
            title={t.label}
            className="relative flex items-center justify-center rounded-full touch-target"
            style={{
              width: 40,
              height: 40,
              minWidth: 40,
              minHeight: 40,
              border: `2px solid ${isActive ? t.color : "transparent"}`,
              boxShadow: isActive
                ? `0 0 12px ${t.color}66, inset 0 0 8px ${t.color}33`
                : "none",
              background: isActive ? `${t.color}18` : "transparent",
              transition: "all 0.25s ease",
            }}
          >
            <span
              className="text-lg select-none"
              style={{
                filter: t.id.startsWith("red")
                  ? "hue-rotate(-40deg) saturate(1.5)"
                  : "none",
              }}
            >
              {t.icon}
            </span>
            {/* Color dot indicator */}
            <span
              className="absolute -bottom-0.5 rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: t.color,
                opacity: isActive ? 1 : 0.4,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
