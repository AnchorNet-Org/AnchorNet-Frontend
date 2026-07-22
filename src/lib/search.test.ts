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

  it("matches when all terms appear across fields (AND semantics)", () => {
    expect(matchesQuery(["Alpha Anchor", "USDC"], "alpha usdc")).toBe(true);
    expect(matchesQuery(["USDC", "Pending"], "usdc pending")).toBe(true);
    expect(matchesQuery(["Alpha", "USDC", "Pending"], "alpha pending")).toBe(true);
  });

  it("does not match when a term is missing from all fields", () => {
    expect(matchesQuery(["Alpha Anchor", "USDC"], "alpha bravo")).toBe(false);
    expect(matchesQuery(["USDC", "Pending"], "usdc settled")).toBe(false);
    expect(matchesQuery(["Alpha", "USDC"], "bravo charlie")).toBe(false);
  });

  it("handles multi-term queries with case insensitivity", () => {
    expect(matchesQuery(["Alpha Anchor", "USDC"], "ALPHA USDC")).toBe(true);
    expect(matchesQuery(["USDC", "Pending"], "usdc PENDING")).toBe(true);
  });

  it("handles multi-term queries with whitespace normalization", () => {
    expect(matchesQuery(["Alpha Anchor", "USDC"], "alpha   usdc")).toBe(true);
    expect(matchesQuery(["USDC", "Pending"], "  usdc \t pending  ")).toBe(true);
  });

  it("preserves single-term behavior unchanged", () => {
    expect(matchesQuery(["Alpha Anchor"], "anchor")).toBe(true);
    expect(matchesQuery(["Alpha Anchor"], "ALPHA")).toBe(true);
    expect(matchesQuery(["Alpha Anchor", "USDC"], "bravo")).toBe(false);
  });
});
