import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  truncateAddress,
  mockAddress,
  saveAccount,
  loadAccount,
  clearAccount,
} from "./wallet";

describe("truncateAddress", () => {
  it("shortens a long address", () => {
    expect(truncateAddress("GABCDEFG1234WXYZ")).toBe("GABC…WXYZ");
  });

  it("leaves short addresses untouched", () => {
    expect(truncateAddress("GABC")).toBe("GABC");
  });

  // Boundary is `address.length <= visible * 2 + 1`: at or below it the
  // address is returned as-is, above it it is truncated. With the default
  // visible = 4 the threshold length is 9.
  it("returns an address of length visible*2 (8) unchanged", () => {
    expect(truncateAddress("ABCDEFGH")).toBe("ABCDEFGH");
  });

  it("returns an address of length visible*2+1 (9) unchanged", () => {
    expect(truncateAddress("ABCDEFGHI")).toBe("ABCDEFGHI");
  });

  it("truncates an address of length visible*2+2 (10)", () => {
    expect(truncateAddress("ABCDEFGHIJ")).toBe("ABCD…GHIJ");
  });

  // The same boundary math must hold for a custom visible value. With
  // visible = 6 the threshold length is 13.
  it("respects the boundary for a custom visible value", () => {
    // length 12 (visible*2) — unchanged
    expect(truncateAddress("ABCDEFGHIJKL", 6)).toBe("ABCDEFGHIJKL");
    // length 13 (visible*2+1) — unchanged
    expect(truncateAddress("ABCDEFGHIJKLM", 6)).toBe("ABCDEFGHIJKLM");
    // length 14 (visible*2+2) — truncated
    expect(truncateAddress("ABCDEFGHIJKLMN", 6)).toBe("ABCDEF…IJKLMN");
  });
});

describe("mockAddress", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("produces a 56-character G-address", () => {
    const address = mockAddress();
    expect(address).toHaveLength(56);
    expect(address.startsWith("G")).toBe(true);
  });

  it("is deterministic for a given explicit seed", () => {
    expect(mockAddress("anchorA")).toBe(mockAddress("anchorA"));
  });

  it("produces the same address within a single session (no explicit seed)", () => {
    const addr1 = mockAddress();
    const addr2 = mockAddress();
    expect(addr1).toBe(addr2);
  });

  it("produces different addresses across fresh sessions (simulated via clearing localStorage)", () => {
    // First session
    const addr1 = mockAddress();

    // Clear localStorage to simulate a fresh session
    window.localStorage.clear();

    // Second session
    const addr2 = mockAddress();

    expect(addr1).not.toBe(addr2);
  });

  it("preserves explicit seed behavior for deterministic testing", () => {
    // Explicit seeds should always produce the same address regardless of session
    const testSeed = "TEST_SEED_123";
    const addr1 = mockAddress(testSeed);

    window.localStorage.clear();

    const addr2 = mockAddress(testSeed);
    expect(addr1).toBe(addr2);
  });
});

describe("mockAddress when crypto.randomUUID is unavailable", () => {
  const STELLAR_ADDRESS_PATTERN = /^G[A-Z0-9]{55}$/;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not throw and returns a well-formed address when crypto.randomUUID is undefined", () => {
    // Simulate a browser where `crypto` exists but `randomUUID` is missing
    // (e.g. an insecure http:// origin where randomUUID is not exposed).
    vi.stubGlobal("crypto", {} as Crypto);

    let address = "";
    expect(() => {
      address = mockAddress();
    }).not.toThrow();

    expect(address).toHaveLength(56);
    expect(address).toMatch(STELLAR_ADDRESS_PATTERN);
  });

  it("does not throw and returns a well-formed address when crypto itself is undefined", () => {
    // Simulate an older/embedded environment with no `crypto` global at all.
    vi.stubGlobal("crypto", undefined);

    let address = "";
    expect(() => {
      address = mockAddress();
    }).not.toThrow();

    expect(address).toHaveLength(56);
    expect(address).toMatch(STELLAR_ADDRESS_PATTERN);
  });

  it("still persists the fallback seed for a stable per-session address", () => {
    vi.stubGlobal("crypto", undefined);

    const addr1 = mockAddress();
    const addr2 = mockAddress();
    expect(addr1).toBe(addr2);
    expect(window.localStorage.getItem("anchornet:wallet:seed")).not.toBeNull();
  });

  it("produces different addresses across fresh sessions with the fallback generator", () => {
    vi.stubGlobal("crypto", undefined);

    const addr1 = mockAddress();
    window.localStorage.clear();
    const addr2 = mockAddress();
    expect(addr1).not.toBe(addr2);
  });

  it("does not affect the explicit-seed path", () => {
    vi.stubGlobal("crypto", undefined);

    expect(mockAddress("anchorA")).toBe(mockAddress("anchorA"));
  });

  it("still uses crypto.randomUUID when it is available", () => {
    const uuid = "12345678-9abc-def0-1234-56789abcdef0";
    const randomUUID = vi.fn(() => uuid);
    vi.stubGlobal("crypto", { randomUUID } as unknown as Crypto);

    const address = mockAddress();
    expect(randomUUID).toHaveBeenCalledTimes(1);
    // Seed = first 20 chars of the uppercased, de-hyphenated UUID.
    const expectedSeed = uuid.replace(/-/g, "").toUpperCase().slice(0, 20);
    expect(window.localStorage.getItem("anchornet:wallet:seed")).toBe(
      expectedSeed,
    );
    expect(address).toBe(`G${expectedSeed.padEnd(55, "X")}`);
  });
});

describe("server-side rendering (no window) guards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saveAccount is a no-op without window", () => {
    vi.stubGlobal("window", undefined);
    expect(() => saveAccount({ address: "GABC" })).not.toThrow();
  });

  it("loadAccount returns null without window", () => {
    vi.stubGlobal("window", undefined);
    expect(loadAccount()).toBeNull();
  });

  it("clearAccount is a no-op without window", () => {
    vi.stubGlobal("window", undefined);
    expect(() => clearAccount()).not.toThrow();
  });

  it("mockAddress falls back to the static SSR seed without window", () => {
    vi.stubGlobal("window", undefined);
    // The SSR path uses the fixed "ANCHORNET" seed.
    expect(mockAddress()).toBe(`G${"ANCHORNET".padEnd(55, "X")}`);
  });
});

describe("wallet session persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing has been saved", () => {
    expect(loadAccount()).toBeNull();
  });

  it("round-trips a saved account", () => {
    const testAddress = mockAddress("test-user");
    saveAccount({ address: testAddress });
    expect(loadAccount()).toEqual({ address: testAddress });
  });

  it("clears the persisted account and session seed", () => {
    saveAccount({ address: mockAddress("test-user") });
    // Generate a session seed by calling mockAddress without args
    mockAddress();

    clearAccount();

    expect(loadAccount()).toBeNull();
    // Verify that the session seed was also cleared
    // (next call should generate a new random seed)
    expect(window.localStorage.getItem("anchornet:wallet:seed")).toBeNull();
  });

  it("is idempotent when the storage key is already absent", () => {
    // Nothing has been saved, so the keys start absent.
    expect(window.localStorage.getItem("anchornet:wallet")).toBeNull();

    // Repeated clears must not throw and must leave storage clean.
    expect(() => {
      clearAccount();
      clearAccount();
    }).not.toThrow();

    expect(loadAccount()).toBeNull();
    expect(window.localStorage.getItem("anchornet:wallet")).toBeNull();
    expect(window.localStorage.getItem("anchornet:wallet:seed")).toBeNull();
  });

  it("ignores malformed persisted data", () => {
    window.localStorage.setItem("anchornet:wallet", "not json");
    expect(loadAccount()).toBeNull();
  });

  it("ignores persisted data missing an address", () => {
    window.localStorage.setItem("anchornet:wallet", JSON.stringify({}));
    expect(loadAccount()).toBeNull();
  });

  it("ignores an empty string address", () => {
    window.localStorage.setItem(
      "anchornet:wallet",
      JSON.stringify({ address: "" }),
    );
    expect(loadAccount()).toBeNull();
  });

  it("ignores an overly long address", () => {
    window.localStorage.setItem(
      "anchornet:wallet",
      JSON.stringify({ address: `G${"A".repeat(100)}` }),
    );
    expect(loadAccount()).toBeNull();
  });

  it("loads a well-formed Stellar-shaped address", () => {
    const wellFormedAddress = mockAddress("well-formed-address");
    window.localStorage.setItem(
      "anchornet:wallet",
      JSON.stringify({ address: wellFormedAddress }),
    );
    expect(loadAccount()).toEqual({ address: wellFormedAddress });
  });
});
