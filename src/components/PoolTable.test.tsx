import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { PoolsPanel } from "./PoolsPanel";
import * as api from "@/lib/api";
import { Pool } from "@/lib/types";

const pools: Pool[] = [
  { asset: "XLM", total: 300, anchors: 2 },
  { asset: "USDC", total: 100, anchors: 5 },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PoolsPanel", () => {
  it("exposes the search/refresh toolbar as a labelled search region", async () => {
    vi.spyOn(api, "fetchPools").mockResolvedValue(pools);

    render(<PoolsPanel />);

    // wait for loading -> ready state
    await waitFor(() =>
      expect(screen.getByRole("search", { name: "Pools search and refresh" })).toBeInTheDocument(),
    );

    const searchRegion = screen.getByRole("search", {
      name: "Pools search and refresh",
    });

    expect(
      within(searchRegion).getByRole("textbox", { name: "Search pools" }),
    ).toBeInTheDocument();
    expect(
      within(searchRegion).getByRole("button", { name: /refresh/i }),
    ).toBeInTheDocument();
  });
});