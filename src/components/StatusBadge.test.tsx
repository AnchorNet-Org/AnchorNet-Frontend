import { describe, it, expect } from "vitest";
import { act, render } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";
import { SETTLEMENT_STATUSES, SettlementStatus } from "@/lib/types";
import { formatStatus } from "@/lib/format";

/** Styling shared by every defined (non-fallback) status variant. */
const KNOWN_VARIANT_CLASSES: Record<SettlementStatus, string> = {
  pending: "text-amber-300",
  executed: "text-emerald-300",
  cancelled: "text-zinc-100",
};

/** Neutral styling used for a status with no defined variant. */
const FALLBACK_CLASS = "text-slate-300";

function getVisibleBadge(container: HTMLElement) {
  const badge = container.querySelector("span:not([aria-live])");
  expect(badge).toBeInTheDocument();
  return badge as HTMLSpanElement;
}

function getLiveRegion(container: HTMLElement) {
  const liveRegion = container.querySelector(
    '[aria-live="polite"][aria-atomic="true"]',
  );
  expect(liveRegion).toBeInTheDocument();
  return liveRegion as HTMLSpanElement;
}

describe("StatusBadge", () => {
  it("renders a capitalized label for each status", () => {
    const { container } = render(<StatusBadge status="pending" />);
    expect(getVisibleBadge(container)).toHaveTextContent("Pending");
  });

  it("applies status-specific styling", () => {
    const { container, rerender } = render(<StatusBadge status="pending" />);
    expect(getVisibleBadge(container)).toHaveClass("text-amber-300");

    rerender(<StatusBadge status="executed" />);
    expect(getVisibleBadge(container)).toHaveClass("text-emerald-300");

    rerender(<StatusBadge status="cancelled" />);
    expect(getVisibleBadge(container)).toHaveClass("text-zinc-100");
  });

  it("renders a defined, non-fallback variant for every settlement status", () => {
    // Driven from the actual type definition (lib/types.ts), so a new status
    // added there without a matching variant here fails this test.
    SETTLEMENT_STATUSES.forEach((status) => {
      const { container, unmount } = render(<StatusBadge status={status} />);
      const badge = getVisibleBadge(container);

      expect(badge).toHaveTextContent(formatStatus(status));
      expect(badge).toHaveClass(KNOWN_VARIANT_CLASSES[status]);
      expect(badge).not.toHaveClass(FALLBACK_CLASS);
      expect(badge.className).not.toMatch(/undefined/);

      unmount();
    });
  });

  it("falls back to a neutral, explicit style for an unrecognized status", () => {
    const invalidStatus = "unknown" as SettlementStatus;
    const { container } = render(<StatusBadge status={invalidStatus} />);

    const badge = getVisibleBadge(container);
    expect(badge).toHaveTextContent("Unknown");
    expect(badge).toHaveClass(FALLBACK_CLASS);
    expect(badge.className).not.toMatch(/undefined/);
  });

  it("mounts an empty polite, atomic live region initially", () => {
    const { container } = render(<StatusBadge status="pending" />);

    const liveRegion = getLiveRegion(container);
    expect(liveRegion).toBeEmptyDOMElement();
    expect(liveRegion).toHaveClass("sr-only");
  });

  it("announces the formatted status after it changes", () => {
    const { container, rerender } = render(<StatusBadge status="pending" />);

    rerender(<StatusBadge status="executed" />);

    expect(getLiveRegion(container)).toHaveTextContent(formatStatus("executed"));
  });

  it("does not mutate the live region when the status stays the same", async () => {
    const { container, rerender } = render(<StatusBadge status="pending" />);
    rerender(<StatusBadge status="executed" />);

    const liveRegion = getLiveRegion(container);
    expect(liveRegion).toHaveTextContent("Executed");

    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(liveRegion, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    rerender(<StatusBadge status="executed" />);
    await act(async () => {});

    mutations.push(...observer.takeRecords());
    observer.disconnect();
    expect(mutations).toHaveLength(0);
  });

  it("announces the newest status after a later transition", () => {
    const { container, rerender } = render(<StatusBadge status="pending" />);

    rerender(<StatusBadge status="executed" />);
    expect(getLiveRegion(container)).toHaveTextContent("Executed");

    rerender(<StatusBadge status="cancelled" />);
    expect(getLiveRegion(container)).toHaveTextContent("Cancelled");
  });
});
