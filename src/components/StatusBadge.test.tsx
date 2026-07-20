import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";
import { SETTLEMENT_STATUSES, SettlementStatus } from "@/lib/types";
import { formatStatus } from "@/lib/format";

/** Styling shared by every defined (non-fallback) status variant. */
const KNOWN_VARIANT_CLASSES: Record<SettlementStatus, string> = {
  pending: "text-amber-300",
  executed: "text-emerald-300",
  cancelled: "text-zinc-300",
};

/** Neutral styling used for a status with no defined variant. */
const FALLBACK_CLASS = "text-slate-300";

describe("StatusBadge", () => {
  it("renders a capitalized label for each status", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("applies status-specific styling", () => {
    const { rerender } = render(<StatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toHaveClass("text-amber-300");

    rerender(<StatusBadge status="executed" />);
    expect(screen.getByText("Executed")).toHaveClass("text-emerald-300");

    rerender(<StatusBadge status="cancelled" />);
    expect(screen.getByText("Cancelled")).toHaveClass("text-zinc-300");
  });

  it("renders a defined, non-fallback variant for every settlement status", () => {
    // Driven from the actual type definition (lib/types.ts), so a new status
    // added there without a matching variant here fails this test.
    SETTLEMENT_STATUSES.forEach((status) => {
      const { unmount } = render(<StatusBadge status={status} />);
      const badge = screen.getByText(formatStatus(status));

      expect(badge).toHaveClass(KNOWN_VARIANT_CLASSES[status]);
      expect(badge).not.toHaveClass(FALLBACK_CLASS);
      expect(badge.className).not.toMatch(/undefined/);

      unmount();
    });
  });

  it("falls back to a neutral, explicit style for an unrecognized status", () => {
    const invalidStatus = "unknown" as SettlementStatus;
    render(<StatusBadge status={invalidStatus} />);

    const badge = screen.getByText("Unknown");
    expect(badge).toHaveClass(FALLBACK_CLASS);
    expect(badge.className).not.toMatch(/undefined/);
  });
});
