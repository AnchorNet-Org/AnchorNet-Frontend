import { describe, it, expect } from "vitest";
import {
  formatAmount,
  pluralize,
  feeInBps,
  formatStatus,
  formatDate,
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
});
