"use client";

import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { useTheme } from "@/hooks/useTheme";

/** Sun icon for light mode. */
function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

/** Moon icon for dark mode. */
function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/** Dark/light mode toggle button placed in the site header. */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/** Top navigation shared across pages. */
export function SiteHeader() {
  return (
    <header className="border-b border-zinc-900">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-white">
          AnchorNet
        </Link>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <Link href="/" className="hover:text-zinc-100">
            Home
          </Link>
          <Link href="/dashboard" className="hover:text-zinc-100">
            Dashboard
          </Link>
          <Link href="/anchors" className="hover:text-zinc-100">
            Anchors
          </Link>
          <Link href="/settlements" className="hover:text-zinc-100">
            Settlements
          </Link>
          <ThemeToggle />
          <ConnectButton />
        </div>
      </nav>
    </header>
  );
}
