import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PoolsPanel } from "./PoolsPanel";
import { fetchPools } from "@/lib/api";

import React from 'react';
import * as search from '@/lib/search';
const mockReplace = vi.fn();
let mockSearchParamsString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/api", () => ({
  fetchPools: vi.fn(),
  isAbortError: (err: unknown) =>
    err instanceof DOMException && err.name === "AbortError",
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsString = "";
});

describe("PoolsPanel", () => {
  it("shows a loading state before pools resolve", () => {
    vi.mocked(fetchPools).mockReturnValue(new Promise(() => {}));
    render(<PoolsPanel />);
    expect(screen.getByLabelText("Loading table data")).toBeInTheDocument();
  });

  it("renders summary stats and the pool list once loaded", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
      { asset: "EURC", total: 500, anchors: 1 },
    ]);

    render(<PoolsPanel />);

    expect(await screen.findByText("USDC")).toBeInTheDocument();
    expect(screen.getByText("EURC")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Assets stat card
    // "1,500" now appears in both the Total liquidity StatCard and the tfoot row
    expect(screen.getAllByText("1,500").length).toBeGreaterThanOrEqual(1);
  });

  it("focuses the search box when / is pressed", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
    ]);

    render(<PoolsPanel />);
    await screen.findByText("USDC");

    fireEvent.keyDown(document.body, { key: "/" });

    expect(document.activeElement).toBe(screen.getByLabelText("Search pools"));
  });

  it("filters pools via the search box", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
      { asset: "EURC", total: 500, anchors: 1 },
    ]);

    render(<PoolsPanel />);
    await screen.findByText("USDC");

    fireEvent.change(screen.getByLabelText("Search pools"), {
      target: { value: "usdc" },
    });

    expect(screen.getByText("USDC")).toBeInTheDocument();
    expect(screen.queryByText("EURC")).not.toBeInTheDocument();
  });

  it("hydrates the search query from the URL querystring on load", async () => {
    mockSearchParamsString = "q=usdc";
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
      { asset: "EURC", total: 500, anchors: 1 },
    ]);

    render(<PoolsPanel />);

    expect(await screen.findByText("USDC")).toBeInTheDocument();
    expect(screen.queryByText("EURC")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search pools")).toHaveValue("usdc");
  });

  it("updates the URL querystring when the search query changes", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
    ]);

    render(<PoolsPanel />);
    await screen.findByText("USDC");

    fireEvent.change(screen.getByLabelText("Search pools"), {
      target: { value: "usdc" },
    });

    expect(mockReplace).toHaveBeenCalledWith("/dashboard?q=usdc", {
      scroll: false,
    });
  });

  it("shows the no-data empty state without a clear-filters action", async () => {
    vi.mocked(fetchPools).mockResolvedValue([]);

    render(<PoolsPanel />);

    expect(
      await screen.findByText(/no liquidity pools yet/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("hides the search input when there are zero pools", async () => {
    vi.mocked(fetchPools).mockResolvedValue([]);

    render(<PoolsPanel />);

    await screen.findByText(/no liquidity pools yet/i);
    expect(
      screen.queryByLabelText("Search pools"),
    ).not.toBeInTheDocument();
  });

  it("shows the search input and keeps the Refresh button when pools exist", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
    ]);

    render(<PoolsPanel />);
    await screen.findByText("USDC");

    expect(screen.getByLabelText("Search pools")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh" }),
    ).toBeInTheDocument();
  });

  it("keeps the Refresh button available even when there are zero pools", async () => {
    vi.mocked(fetchPools).mockResolvedValue([]);

    render(<PoolsPanel />);
    await screen.findByText(/no liquidity pools yet/i);

    expect(
      screen.getByRole("button", { name: "Refresh" }),
    ).toBeInTheDocument();
  });

  it("shows a no-results empty state when the search matches nothing", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
    ]);

    render(<PoolsPanel />);
    await screen.findByText("USDC");

    fireEvent.change(screen.getByLabelText("Search pools"), {
      target: { value: "zzz" },
    });

    expect(
      await screen.findByText("No pools match your search."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/no liquidity pools yet/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(await screen.findByText("USDC")).toBeInTheDocument();
    expect(screen.getByLabelText("Search pools")).toHaveValue("");
  });

  it("debounces the search filter, updating the list only after the delay", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(fetchPools).mockResolvedValue([
        { asset: "USDC", total: 1000, anchors: 2 },
        { asset: "EURC", total: 500, anchors: 1 },
      ]);

      render(<PoolsPanel />);
      await screen.findByText("USDC");
      await screen.findByText("EURC");

      fireEvent.change(screen.getByLabelText("Search pools"), {
        target: { value: "usdc" },
      });

      expect(screen.getByLabelText("Search pools")).toHaveValue("usdc");
      expect(screen.getByText("EURC")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(199);
      });
      expect(screen.getByText("EURC")).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.queryByText("EURC")).not.toBeInTheDocument();
      expect(screen.getByText("USDC")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows an error message and retries on demand", async () => {
    vi.mocked(fetchPools).mockRejectedValueOnce(new Error("network down"));

    render(<PoolsPanel />);
    expect(await screen.findByText(/network down/i)).toBeInTheDocument();

    vi.mocked(fetchPools).mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(fetchPools).toHaveBeenCalledTimes(2));
  });

  it("does not recompute filteredPools on unrelated parent re-render", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
      { asset: "EURC", total: 500, anchors: 1 },
    ]);

    const matchesSpy = vi.spyOn(search, "matchesQuery");

    const Wrapper = () => {
      const [tick, setTick] = React.useState(0);
      return (
        <div>
          <button onClick={() => setTick((c) => c + 1)} data-testid="inc">
            Inc
          </button>
          <PoolsPanel />
        </div>
      );
    };

    render(<Wrapper />);
    await screen.findByText("USDC");
    // initial calls: one per pool
    const initialCalls = matchesSpy.mock.calls.length;
    expect(initialCalls).toBeGreaterThanOrEqual(2);

    // Trigger unrelated parent re-render
    fireEvent.click(screen.getByTestId("inc"));
    // Wait a tick to allow possible effects
    await new Promise((r) => setTimeout(r, 0));
    const afterCalls = matchesSpy.mock.calls.length;
    expect(afterCalls).toBe(initialCalls);
  });
});
