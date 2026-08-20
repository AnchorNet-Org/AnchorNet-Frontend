import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Suppress the NEXT_PUBLIC_API_URL missing warning that fires as a module
// side-effect when api.ts is imported in tests.
vi.spyOn(console, "warn").mockImplementation(() => {});

// Node.js v26 removed the implicit localStorage in jsdom; provide a mock so
// tests that rely on window.localStorage (theme persistence, wallet session,
// etc.) continue to work.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => store.set(key, value)),
      removeItem: vi.fn((key: string) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
      get length() {
        return store.size;
      },
      key: vi.fn((index: number) => [...store.keys()][index] ?? null),
    },
    writable: true,
    configurable: true,
  });
}

// Unmount rendered components between tests so component tests don't leak
// into one another (auto-cleanup relies on Jest/vitest globals, which this
// project intentionally doesn't enable).
afterEach(() => {
  cleanup();
});

// Ensure a simple in‑memory localStorage implementation exists in the jsdom
// environment where `window.localStorage` may be undefined. This mimics the
// browser API sufficiently for the wallet utilities and related tests.
if (typeof window !== "undefined" && !window.localStorage) {
  const store = new Map<string, string>();
  window.localStorage = {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  } as Storage;
}

