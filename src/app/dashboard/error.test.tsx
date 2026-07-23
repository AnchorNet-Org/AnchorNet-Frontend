/**
 * Tests for the dashboard route error boundary.
 *
 * Verifies that:
 *  - The boundary renders the RouteError fallback with the correct title.
 *  - Clicking "Try again" fires the Next.js `reset` callback (not a full
 *    page reload via window.location.reload).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardError from "./error";

// Stub SiteHeader so we don't need a WalletProvider in boundary tests.
vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

describe("DashboardError boundary", () => {
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reloadMock = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the 'Could not load the dashboard' title", () => {
    render(<DashboardError error={new Error("fetch failed")} reset={() => {}} />);
    expect(
      screen.getByText("Could not load the dashboard"),
    ).toBeInTheDocument();
  });

  it("calls the reset callback when 'Try again' is clicked", () => {
    const reset = vi.fn();
    render(<DashboardError error={new Error("fetch failed")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does NOT call window.location.reload when 'Try again' is clicked", () => {
    const reset = vi.fn();
    render(<DashboardError error={new Error("fetch failed")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
