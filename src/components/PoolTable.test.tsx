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
});
