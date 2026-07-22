import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import { PoolTable } from "./PoolTable";
import { PoolsPanel } from "./PoolsPanel";
import * as api from "@/lib/api";
import { Pool } from "@/lib/types";

const pools: Pool[] = [
  { asset: "XLM", total: 300, anchors: 2 },
  { asset: "USDC", total: 100, anchors: 5 },
  { asset: "EURC", total: 200, anchors: 1 },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

function assetCells() {
  // Only look at tbody rows (skip the thead header and tfoot totals row)
  const tbody = document.querySelector("tbody")!;
  const rows = within(tbody).getAllByRole("row");
  return rows.map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("PoolTable", () => {
  it("renders an empty-state message when there are no pools", () => {
    render(<PoolTable pools={[]} />);
    expect(
      screen.getByText(/No liquidity pools yet/),
    ).toBeInTheDocument();
  });

  it("renders rows in their original order by default", () => {
    render(<PoolTable pools={pools} />);
    expect(assetCells()).toEqual(["XLM", "USDC", "EURC"]);
  });

  it("sorts ascending by total liquidity on the first click", () => {
    render(<PoolTable pools={pools} />);
    fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
    expect(assetCells()).toEqual(["USDC", "EURC", "XLM"]);
  });

  it("sorts descending by total liquidity on a second click", () => {
    render(<PoolTable pools={pools} />);
    fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
    fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
    expect(assetCells()).toEqual(["XLM", "EURC", "USDC"]);
  });

  it("renders a totals row summing liquidity and anchor count", () => {
    render(<PoolTable pools={pools} />);
    // XLM(300) + USDC(100) + EURC(200) = 600; anchors 2+5+1 = 8
    const tfoot = document.querySelector("tfoot");
    expect(tfoot).toBeInTheDocument();
    expect(tfoot).toHaveTextContent("Total");
    expect(tfoot).toHaveTextContent("600");
    expect(tfoot).toHaveTextContent("8 anchors");
  });

  it("omits the totals row when there are no pools", () => {
    render(<PoolTable pools={[]} />);
    expect(document.querySelector("tfoot")).not.toBeInTheDocument();
  });

  it("totals row reflects the filtered pool list passed in", () => {
    const filtered = [pools[0], pools[2]]; // XLM(300,2) + EURC(200,1)
    render(<PoolTable pools={filtered} />);
    const tfoot = document.querySelector("tfoot");
    expect(tfoot).toHaveTextContent("500");
    expect(tfoot).toHaveTextContent("3 anchors");
  });

  describe("initial aria-sort accessibility", () => {
    it("announces all column headers as aria-sort=none on initial render", () => {
      render(<PoolTable pools={pools} />);

      const assetHeader = screen.getByLabelText("Sort by Asset").closest("th");
      const liquidityHeader = screen
        .getByLabelText("Sort by Total liquidity")
        .closest("th");
      const anchorsHeader = screen.getByLabelText("Sort by Anchors").closest("th");

      expect(assetHeader).toHaveAttribute("aria-sort", "none");
      expect(liquidityHeader).toHaveAttribute("aria-sort", "none");
      expect(anchorsHeader).toHaveAttribute("aria-sort", "none");
    });

    it("updates aria-sort to ascending on first column click", () => {
      render(<PoolTable pools={pools} />);
      const header = screen
        .getByLabelText("Sort by Total liquidity")
        .closest("th");

      expect(header).toHaveAttribute("aria-sort", "none");

      fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
      expect(header).toHaveAttribute("aria-sort", "ascending");
    });

    it("updates aria-sort to descending on second column click", () => {
      render(<PoolTable pools={pools} />);
      const header = screen
        .getByLabelText("Sort by Total liquidity")
        .closest("th");

      fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
      fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
      expect(header).toHaveAttribute("aria-sort", "descending");
    });

    it("resets aria-sort to none on third column click", () => {
      render(<PoolTable pools={pools} />);
      const header = screen
        .getByLabelText("Sort by Total liquidity")
        .closest("th");

      fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
      fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
      fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
      expect(header).toHaveAttribute("aria-sort", "none");
    });

    it("switches aria-sort between columns when clicking different headers", () => {
      render(<PoolTable pools={pools} />);
      const assetHeader = screen.getByLabelText("Sort by Asset").closest("th");
      const liquidityHeader = screen
        .getByLabelText("Sort by Total liquidity")
        .closest("th");

      // Click Asset (first sort)
      fireEvent.click(screen.getByLabelText("Sort by Asset"));
      expect(assetHeader).toHaveAttribute("aria-sort", "ascending");
      expect(liquidityHeader).toHaveAttribute("aria-sort", "none");

      // Click Liquidity (switches to that column, ascending)
      fireEvent.click(screen.getByLabelText("Sort by Total liquidity"));
      expect(assetHeader).toHaveAttribute("aria-sort", "none");
      expect(liquidityHeader).toHaveAttribute("aria-sort", "ascending");
    });
  });
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
