import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveAccount,
  loadAccount,
  clearAccount,
  truncateAddress,
  mockAddress,
  STORAGE_KEY,
} from "./wallet";

describe("wallet.ts", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("saveAccount", () => {
    it("saves account to localStorage", () => {
      saveAccount({ address: "GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQ" });
      const stored = window.localStorage.getItem(STORAGE_KEY);
      expect(stored).toBe('{"address":"GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQ"}');
    });

    it("does nothing if window is undefined", () => {
      const originalWindow = global.window;
      // @ts-expect-error simulating environment
      delete global.window;
      expect(() => saveAccount({ address: "G123" })).not.toThrow();
      global.window = originalWindow;
    });
  });

  describe("loadAccount", () => {
    it("loads a valid account from localStorage", () => {
      const validAddr = mockAddress("TESTSEED");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: validAddr }));
      const account = loadAccount();
      expect(account).toEqual({ address: validAddr });
    });

    it("returns null if no account is in localStorage", () => {
      expect(loadAccount()).toBeNull();
    });

    it("returns null if JSON is invalid", () => {
      window.localStorage.setItem(STORAGE_KEY, '{invalid json');
      expect(loadAccount()).toBeNull();
    });

    it("returns null if address is not a string", () => {
      window.localStorage.setItem(STORAGE_KEY, '{"address": 123}');
      expect(loadAccount()).toBeNull();
    });

    it("returns null if address fails regex validation", () => {
      // Too short
      window.localStorage.setItem(STORAGE_KEY, '{"address": "G123"}');
      expect(loadAccount()).toBeNull();
    });
    
    it("returns null if window is undefined", () => {
      const originalWindow = global.window;
      // @ts-expect-error simulating environment
      delete global.window;
      expect(loadAccount()).toBeNull();
      global.window = originalWindow;
    });
  });

  describe("clearAccount", () => {
    it("removes the storage keys", () => {
      window.localStorage.setItem(STORAGE_KEY, "test");
      window.localStorage.setItem("anchornet:wallet:seed", "test-seed");
      clearAccount();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(window.localStorage.getItem("anchornet:wallet:seed")).toBeNull();
    });
  });

  describe("truncateAddress", () => {
    it("truncates long addresses", () => {
      const addr = "GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQ";
      expect(truncateAddress(addr, 4)).toBe("GABC…NOPQ");
    });

    it("returns original string if it is too short to truncate", () => {
      expect(truncateAddress("G123", 4)).toBe("G123");
    });
  });

  describe("mockAddress", () => {
    it("generates a deterministic address from a seed", () => {
      const addr1 = mockAddress("TESTSEED");
      const addr2 = mockAddress("TESTSEED");
      expect(addr1).toBe(addr2);
      expect(addr1).toMatch(/^G[A-Z0-9]{55}$/);
    });

    it("persists a session seed when no seed is provided", () => {
      const addr1 = mockAddress();
      const addr2 = mockAddress();
      expect(addr1).toBe(addr2);
      expect(window.localStorage.getItem("anchornet:wallet:seed")).not.toBeNull();
    });
  });

  describe("Wallet Provider / Connection Error Paths (Defects)", () => {
    it.todo("Provider absent — the extension is not installed");
    it.todo("User rejection — the connection prompt is dismissed");
    it.todo("Network / chain mismatch — the wallet is on a different network than the app expects");
    it.todo("Account change mid-session — the user switches accounts while connected");
    it.todo("Disconnect — cleanup of listeners and cached state");
  });
});
