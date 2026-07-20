import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PoolTable } from "./PoolTable";
import { Pool } from "@/lib/types";

const pools: Pool[] = [
  { asset: "XLM", total: 300, anchors: 2 },
  { asset: "USDC", total: 100, anchors: 5 },
  { asset: "EURC", total: 200, anchors: 1 },
];

function assetCells() {
  const rows = screen.getAllByRole("row").slice(1); // skip the header row
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

  it("sorts alphabetically by asset", () => {
    render(<PoolTable pools={pools} />);
    fireEvent.click(screen.getByLabelText("Sort by Asset"));
    expect(assetCells()).toEqual(["EURC", "USDC", "XLM"]);
  });

  it("applies a visible focus style to sortable header buttons", () => {
    render(<PoolTable pools={pools} />);
    const sortButton = screen.getByLabelText("Sort by Asset");
    expect(sortButton).toHaveClass("focus-visible:border", "focus-visible:border-zinc-600");
  });

  it("exposes the current sort direction via aria-sort", () => {
    render(<PoolTable pools={pools} />);
    const header = screen.getByLabelText("Sort by Asset").closest("th");
    expect(header).toHaveAttribute("aria-sort", "none");

    fireEvent.click(screen.getByLabelText("Sort by Asset"));
    expect(header).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByLabelText("Sort by Asset"));
    expect(header).toHaveAttribute("aria-sort", "descending");
  });
});
