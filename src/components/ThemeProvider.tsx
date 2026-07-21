"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Theme,
  applyTheme,
  loadTheme,
  resolveTheme,
  saveTheme,
  clearTheme,
} from "@/lib/theme";

export interface ThemeContextValue {
  /** The currently active theme ("light" or "dark"). */
  theme: Theme;
  /**
   * `true` when the user has explicitly overridden the system preference;
   * `false` when following the system default.
   */
  isOverridden: boolean;
  /** Toggles between light and dark and persists the choice. */
  toggleTheme: () => void;
  /** Clears the stored override so the theme reverts to the system default. */
  resetToSystem: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Provides theme state and a toggle to the component tree.
 *
 * The initial theme is resolved from localStorage (override) or the OS
 * media query (default), matching the anti-flash script in layout.tsx so
 * there is no mismatch between server render and client hydration.
 *
 * `suppressHydrationWarning` on `<html>` in layout.tsx suppresses the
 * unavoidable attribute difference when the inline script runs before React
 * hydrates.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start with a placeholder that matches what the server would render.
  // The real value is read after mount (like WalletProvider) to avoid a
  // hydration mismatch.
  const [theme, setTheme] = useState<Theme>("light");
  const [isOverridden, setIsOverridden] = useState(false);

  useEffect(() => {
    // Resolve on the client only, after mount.
    const resolved = resolveTheme();
    const stored = loadTheme();
    // The client-only value intentionally replaces the hydration placeholder.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(resolved);
    setIsOverridden(stored !== null);
    applyTheme(resolved);

    // Keep in sync with OS preference changes when no override is set.
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const handleChange = () => {
      if (loadTheme() === null) {
        const next: Theme = mq.matches ? "dark" : "light";
        setTheme(next);
        applyTheme(next);
      }
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      saveTheme(next);
      applyTheme(next);
      setIsOverridden(true);
      return next;
    });
  }, []);

  const resetToSystem = useCallback(() => {
    clearTheme();
    const system = resolveTheme(); // now reads system (no stored override)
    setTheme(system);
    applyTheme(system);
    setIsOverridden(false);
  }, []);

  const value = useMemo(
    () => ({ theme, isOverridden, toggleTheme, resetToSystem }),
    [theme, isOverridden, toggleTheme, resetToSystem],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
