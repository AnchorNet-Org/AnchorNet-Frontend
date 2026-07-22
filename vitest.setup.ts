import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

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
  // @ts-ignore – extending the global window object for test purposes
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

