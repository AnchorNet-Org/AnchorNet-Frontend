/**
 * Theme helpers for dark/light mode persistence.
 *
 * Mirrors the wallet session persistence pattern in lib/wallet.ts:
 * explicit overrides are stored in localStorage so they survive a page
 * refresh.  When no override is present the resolved theme falls back to the
 * OS/browser `prefers-color-scheme` media query.
 */

export type Theme = "light" | "dark";

/** localStorage key the theme override is persisted under. */
const STORAGE_KEY = "anchornet:theme";

/**
 * Reads the stored theme override, if any.
 * Returns `null` when no explicit preference has been saved (i.e. the
 * system default should be used).
 */
export function loadTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark") return raw;
  return null;
}

/**
 * Persists an explicit theme override so it survives a page reload.
 */
export function saveTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Removes the stored override so the theme reverts to the system default.
 */
export function clearTheme(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Returns `"dark"` when the OS/browser prefers dark color scheme, otherwise
 * `"light"`.  Safe to call only in a browser context.
 */
export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Resolves the effective theme: stored override → system preference.
 */
export function resolveTheme(): Theme {
  return loadTheme() ?? getSystemTheme();
}

/**
 * Applies the given theme to the document root by toggling the `dark` class
 * and `data-theme` attribute used by the CSS variables.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}
