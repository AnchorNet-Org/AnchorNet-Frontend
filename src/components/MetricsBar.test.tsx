import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MetricsBar } from "./MetricsBar";
import { fetchMetrics } from "@/lib/metricsApi";
import type { Metrics } from "@/lib/types";

vi.mock("@/lib/metricsApi", () => ({
  fetchMetrics: vi.fn(),
}));

const metrics: Metrics = {
  anchors: 5,
  activeAnchors: 3,
  pools: 2,
  totalLiquidity: 12_345,
  settlements: 10,
  pendingSettlements: 4,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("MetricsBar", () => {
  beforeEach(() => {
    vi.mocked(fetchMetrics).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it("shows a loading state before metrics resolve", () => {
    vi.mocked(fetchMetrics).mockReturnValue(new Promise(() => {}));
    render(<MetricsBar />);
    expect(screen.getByText(/loading metrics/i)).toBeInTheDocument();
  });

  it("renders metrics once loaded", async () => {
    vi.mocked(fetchMetrics).mockResolvedValue({
      anchors: 5,
      activeAnchors: 3,
      pools: 2,
      totalLiquidity: 12_345,
      settlements: 10,
      pendingSettlements: 4,
    });

    render(<MetricsBar />);

    await waitFor(() => {
      expect(screen.getByText("3/5")).toBeInTheDocument();
    });
    expect(screen.getByText("12,345")).toBeInTheDocument();
    expect(screen.getByText("4 pending")).toBeInTheDocument();
  });

  it("shows an error message when metrics fail to load", async () => {
    vi.mocked(fetchMetrics).mockRejectedValue(new Error("network down"));

    render(<MetricsBar />);

    await waitFor(() => {
      expect(screen.getByText(/network down/i)).toBeInTheDocument();
    });
  });

  it("clicking Refresh fetches immediately and shows a spinner while in flight", async () => {
    vi.mocked(fetchMetrics).mockResolvedValueOnce(metrics);
    render(<MetricsBar />);
    await waitFor(() => expect(screen.getByText("3/5")).toBeInTheDocument());

    const second = deferred<Metrics>();
    vi.mocked(fetchMetrics).mockReturnValueOnce(second.promise);

    const button = screen.getByRole("button", { name: /refresh metrics/i });
    fireEvent.click(button);

    expect(fetchMetrics).toHaveBeenCalledTimes(2);
    expect(button).toBeDisabled();
    expect(button.querySelector(".animate-spin")).not.toBeNull();
    // The refresh is silent: existing data stays visible meanwhile.
    expect(screen.getByText("3/5")).toBeInTheDocument();

    await act(async () => second.resolve({ ...metrics, activeAnchors: 4 }));

    expect(screen.getByText("4/5")).toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(button.querySelector(".animate-spin")).toBeNull();
  });

  it("keeps the auto-refresh interval on schedule after a manual refresh", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchMetrics).mockResolvedValue(metrics);

    render(<MetricsBar />);
    await act(async () => {});
    expect(fetchMetrics).toHaveBeenCalledTimes(1);

    // Manual refresh halfway through the 15s interval.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_500);
    });
    fireEvent.click(screen.getByRole("button", { name: /refresh metrics/i }));
    await act(async () => {});
    expect(fetchMetrics).toHaveBeenCalledTimes(2);

    // The interval still fires at its original 15s mark, 7.5s later.
    const tick = deferred<Metrics>();
    vi.mocked(fetchMetrics).mockReturnValueOnce(tick.promise);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_500);
    });
    expect(fetchMetrics).toHaveBeenCalledTimes(3);

    // Silent interval ticks don't show the button spinner.
    const button = screen.getByRole("button", { name: /refresh metrics/i });
    expect(button.querySelector(".animate-spin")).toBeNull();
    expect(button).toBeEnabled();

    await act(async () => tick.resolve(metrics));
  });
});

describe("MetricsBar single-snapshot edge case", () => {
  it("renders cleanly from a single metrics reading with no delta/trend indicator", async () => {
    vi.mocked(fetchMetrics).mockResolvedValue({
      anchors: 5,
      activeAnchors: 3,
      pools: 2,
      totalLiquidity: 12_345,
      settlements: 10,
      pendingSettlements: 4,
    });

    render(<MetricsBar />);

    await waitFor(() => {
      expect(screen.getByText("3/5")).toBeInTheDocument();
    });

    // MetricsBar currently has no trend/delta rendering, and fetchMetrics
    // returns a single current reading rather than a history of snapshots.
    // This test locks in that a single reading renders cleanly with no
    // error and no stray delta/comparison artifacts, so that if history-
    // based trend rendering is added later, the "first snapshot, no prior
    // point to diff against" case is guarded against regressions.
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trend/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delta/i)).not.toBeInTheDocument();
  });
});
