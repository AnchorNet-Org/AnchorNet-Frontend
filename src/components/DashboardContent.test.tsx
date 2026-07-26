import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DashboardContent } from "./DashboardContent";
import { fetchPools } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  fetchPools: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardContent", () => {
  it("fetches pools exactly once on mount", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
      { asset: "EURC", total: 500, anchors: 1 },
    ]);

    render(<DashboardContent />);

    await waitFor(() => {
      expect(fetchPools).toHaveBeenCalledTimes(1);
    });
  });

  it("passes pool asset codes to QuoteForm via knownAssets prop", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
      { asset: "EURC", total: 500, anchors: 1 },
    ]);

    render(<DashboardContent />);

    await waitFor(() => {
      expect(screen.getByText("USDC")).toBeInTheDocument();
    });

    // Verify the datalist is populated with the asset codes
    const datalist = document.getElementById("quote-form-asset-list");
    expect(datalist).toBeInTheDocument();

    const options = datalist!.querySelectorAll("option");
    const values = Array.from(options).map((o) => o.value);
    expect(values).toEqual(["USDC", "EURC"]);
  });

  it("passes pools data to PoolsPanel", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
    ]);

    render(<DashboardContent />);

    await waitFor(() => {
      expect(screen.getByText("USDC")).toBeInTheDocument();
    });

    // Verify PoolsPanel renders the pools data
    expect(screen.getByText("1")).toBeInTheDocument(); // Assets stat card
  });

  it("does not call fetchPools again when QuoteForm is rendered with knownAssets", async () => {
    vi.mocked(fetchPools).mockResolvedValue([
      { asset: "USDC", total: 1000, anchors: 2 },
    ]);

    render(<DashboardContent />);

    await waitFor(() => {
      expect(fetchPools).toHaveBeenCalledTimes(1);
    });

    // Ensure fetchPools is not called again after initial render
    await waitFor(() => {
      expect(fetchPools).toHaveBeenCalledTimes(1);
    }, { timeout: 100 });
  });
});
