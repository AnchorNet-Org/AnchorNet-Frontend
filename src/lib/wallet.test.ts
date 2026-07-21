import { describe, it, expect, beforeEach } from "vitest";
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
});
