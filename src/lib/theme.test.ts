import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  loadTheme,
  saveTheme,
  clearTheme,
  getSystemTheme,
  resolveTheme,
  applyTheme,
} from "./theme";

const STORAGE_KEY = "anchornet:theme";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockMediaQuery(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

// ---------------------------------------------------------------------------
// loadTheme / saveTheme / clearTheme
// ---------------------------------------------------------------------------

describe("loadTheme", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when nothing is stored", () => {
    expect(loadTheme()).toBeNull();
  });

  it("returns 'dark' when that is stored", () => {
    localStorage.setItem(STORAGE_KEY, "dark");
    expect(loadTheme()).toBe("dark");
  });

  it("returns 'light' when that is stored", () => {
    localStorage.setItem(STORAGE_KEY, "light");
    expect(loadTheme()).toBe("light");
  });

  it("returns null for an unrecognised stored value", () => {
    localStorage.setItem(STORAGE_KEY, "system");
    expect(loadTheme()).toBeNull();
  });
});

describe("saveTheme", () => {
  beforeEach(() => localStorage.clear());

  it("persists 'dark' to localStorage", () => {
    saveTheme("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  it("persists 'light' to localStorage", () => {
    saveTheme("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("round-trips through loadTheme", () => {
    saveTheme("dark");
    expect(loadTheme()).toBe("dark");
    saveTheme("light");
    expect(loadTheme()).toBe("light");
  });
});

describe("clearTheme", () => {
  beforeEach(() => localStorage.clear());

  it("removes a previously saved theme", () => {
    saveTheme("dark");
    clearTheme();
    expect(loadTheme()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("is a no-op when nothing is stored", () => {
    expect(() => clearTheme()).not.toThrow();
    expect(loadTheme()).toBeNull();
  });

  it("is idempotent (multiple clears do not throw)", () => {
    saveTheme("light");
    expect(() => {
      clearTheme();
      clearTheme();
    }).not.toThrow();
    expect(loadTheme()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getSystemTheme
// ---------------------------------------------------------------------------

describe("getSystemTheme", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns 'dark' when prefers-color-scheme: dark matches", () => {
    mockMediaQuery(true);
    expect(getSystemTheme()).toBe("dark");
  });

  it("returns 'light' when prefers-color-scheme: dark does not match", () => {
    mockMediaQuery(false);
    expect(getSystemTheme()).toBe("light");
  });
});

// ---------------------------------------------------------------------------
// resolveTheme
// ---------------------------------------------------------------------------

describe("resolveTheme", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("returns the stored override when one exists", () => {
    mockMediaQuery(false); // system says light
    saveTheme("dark");     // but user overrode to dark
    expect(resolveTheme()).toBe("dark");
  });

  it("falls back to the system preference when no override is stored", () => {
    mockMediaQuery(true); // system says dark
    expect(resolveTheme()).toBe("dark");
  });

  it("follows a stored light override even when system is dark", () => {
    mockMediaQuery(true); // system says dark
    saveTheme("light");   // user overrode to light
    expect(resolveTheme()).toBe("light");
  });
});

// ---------------------------------------------------------------------------
// applyTheme
// ---------------------------------------------------------------------------

describe("applyTheme", () => {
  beforeEach(() => {
    // Reset document attributes/classes before each test.
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
  });

  it("adds .dark class and data-theme='dark' for the dark theme", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("removes .dark class and sets data-theme='light' for the light theme", () => {
    // Start in dark mode.
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");

    applyTheme("light");

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("is idempotent: applying dark twice leaves the DOM in dark mode", () => {
    applyTheme("dark");
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
