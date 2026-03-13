"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 w-full nav-blur"
      style={{
        backgroundColor: "var(--nav-bg)",
        borderBottom: "2px solid var(--nav-border)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:py-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 touch-target"
          onClick={() => setMenuOpen(false)}
        >
          <span className="text-2xl sm:text-3xl font-fredoka font-bold text-gradient">
            Yo&euml;l The G
          </span>
          <span className="text-xl sm:text-2xl" aria-hidden="true">
            🎮
          </span>
        </Link>

        {/* Desktop nav items */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />

          <Link
            href="/profile"
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-fredoka text-sm font-medium touch-target"
            style={{
              color: "var(--primary)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            <span aria-hidden="true">👤</span>
            <span>Profile</span>
          </Link>

          <Link
            href="/admin"
            className="flex items-center justify-center rounded-lg touch-target"
            style={{
              width: 40,
              height: 40,
              color: "var(--text)",
              opacity: 0.5,
            }}
            aria-label="Admin panel"
            title="Admin"
          >
            {/* Gear icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex md:hidden items-center justify-center rounded-lg touch-target"
          style={{
            width: 48,
            height: 48,
            color: "var(--text)",
          }}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            /* X icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            /* Hamburger icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="flex flex-col items-center gap-4 px-4 pb-4 md:hidden"
          style={{
            backgroundColor: "var(--nav-bg)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <ThemeToggle />

          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-fredoka text-base font-medium touch-target"
            style={{
              color: "var(--primary)",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            <span aria-hidden="true">👤</span>
            <span>Profile</span>
          </Link>

          <Link
            href="/admin"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-fredoka text-sm touch-target"
            style={{
              color: "var(--text)",
              opacity: 0.6,
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Admin</span>
          </Link>
        </div>
      )}
    </nav>
  );
}
