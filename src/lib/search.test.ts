import { describe, it, expect } from "vitest";
import { matchesQuery } from "./search";

describe("matchesQuery", () => {
  it("matches everything for a blank query", () => {
    expect(matchesQuery(["Alpha", "alpha.stellar.org"], "")).toBe(true);
    expect(matchesQuery(["Alpha"], "   ")).toBe(true);
  });

  it("matches a case-insensitive substring", () => {
    expect(matchesQuery(["Alpha Anchor"], "anchor")).toBe(true);
    expect(matchesQuery(["Alpha Anchor"], "ALPHA")).toBe(true);
  });

  it("trims surrounding whitespace from the query", () => {
    expect(matchesQuery(["Alpha Anchor"], "  alpha  ")).toBe(true);
    expect(matchesQuery(["Alpha Anchor"], "\talpha\n")).toBe(true);
  });

  it("collapses internal repeated whitespace in the query", () => {
    expect(matchesQuery(["Alpha Anchor"], "alpha   anchor")).toBe(true);
    expect(matchesQuery(["Alpha Anchor"], "alpha\t\tanchor")).toBe(true);
    expect(matchesQuery(["Alpha Anchor"], "  alpha \t  anchor  ")).toBe(true);
  });

  it("returns false when no field contains the query", () => {
    expect(matchesQuery(["Alpha Anchor", "USDC"], "bravo")).toBe(false);
  });

  it("stringifies numeric fields before matching", () => {
    expect(matchesQuery([42, "USDC"], "42")).toBe(true);
    expect(matchesQuery([42], "4")).toBe(true);
  });

  it("checks every field, not just the first", () => {
    expect(matchesQuery(["Alpha", "USDC"], "usdc")).toBe(true);
  });
});
