import { describe, it, expect } from "vitest";
import {
  formatAmount,
  pluralize,
  feeInBps,
  formatStatus,
  formatDate, formatPercent,
} from "./format";

describe("formatAmount", () => {
  it("preserves fractional digits up to 7 decimal places", () => {
    expect(formatAmount(1234.5678)).toBe("1,234.5678");
    expect(formatAmount(0.0000001)).toBe("0.0000001");
    expect(formatAmount(1000.6)).toBe("1,000.6");
  });

  it("trims trailing zeros for whole numbers", () => {
    expect(formatAmount(1000)).toBe("1,000");
    expect(formatAmount(1234567)).toBe("1,234,567");
  });
});

describe("pluralize", () => {
  it("keeps the noun singular for a count of one", () => {
    expect(pluralize(1, "anchor")).toBe("1 anchor");
  });

  it("pluralizes other counts", () => {
    expect(pluralize(0, "anchor")).toBe("0 anchors");
    expect(pluralize(3, "anchor")).toBe("3 anchors");
  });
});

describe("feeInBps", () => {
  it("derives basis points from a fee/amount pair", () => {
    expect(feeInBps(1, 1000)).toBe("10 bps");
  });

  it("guards against a zero amount", () => {
    expect(feeInBps(0, 0)).toBe("0 bps");
  });
});

describe("formatStatus", () => {
  it("capitalizes the status", () => {
    expect(formatStatus("pending")).toBe("Pending");
    expect(formatStatus("executed")).toBe("Executed");
  });
});

describe("formatDate", () => {
  it("formats an ISO timestamp to a short date", () => {
    expect(formatDate("2024-03-15T12:34:56.000Z")).toBe("2024-03-15");
  });

  it("returns a dash for empty or invalid input", () => {
    expect(formatDate("")).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });

  it("uses the local calendar date even when it differs from the UTC date", () => {
    // 2026-01-15T23:30:00-08:00 is 2026-01-16T07:30:00Z in UTC.
    // In a local time zone at or behind UTC-8 (e.g. America/Los_Angeles,
    // configured via TZ for the test run), this should resolve to the
    // 15th — the day the timestamp actually occurred locally — not the
    // 16th, which is what the old UTC-based implementation returned.
    const iso = "2026-01-15T23:30:00-08:00";
    expect(formatDate(iso)).toBe("2026-01-15");
  });
});

describe("formatPercent", () => {
  it("formats with default 1 decimal place", () => {
    expect(formatPercent(75)).toBe("75.0%");
    expect(formatPercent(0)).toBe("0.0%");
  });
  it("allows custom digits", () => {
    expect(formatPercent(75, 2)).toBe("75.00%");
    expect(formatPercent(75.123, 3)).toBe("75.123%");
  });
});
