import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SettlementTable } from "./SettlementTable";
import { Settlement } from "@/lib/types";

function settlement(overrides: Partial<Settlement>): Settlement {
  return {
    id: 1,
    anchor: "a",
    asset: "USDC",
    amount: 0,
    fee: 0,
    status: "pending",
    createdAt: "",
    ...overrides,
  };
}

const settlements: Settlement[] = [
  settlement({ id: 1, amount: 300, fee: 3 }),
  settlement({ id: 2, amount: 100, fee: 1 }),
  settlement({ id: 3, amount: 200, fee: 2 }),
];

function amountCells() {
  const rows = within(document.querySelector("tbody")!).getAllByRole("row");
  return rows.map((row) => within(row).getAllByRole("cell")[3].textContent);
}

function statusCells() {
  const rows = within(document.querySelector("tbody")!).getAllByRole("row");
  return rows.map((row) => within(row).getAllByRole("cell")[5].textContent);
}

describe("SettlementTable sorting", () => {
  it("makes the full first cell a settlement detail link", () => {
    render(<SettlementTable settlements={[settlements[0]]} />);

    const row = within(document.querySelector("tbody")!).getByRole("row");
    const firstCell = within(row).getAllByRole("cell")[0];
    const link = within(firstCell).getByRole("link", { name: "1" });

    expect(link).toHaveAttribute("href", "/settlements/1");
    expect(link).toHaveClass("block", "hover:underline");
  });

  it("keeps pending-row actions independently clickable", () => {
    const onExecute = vi.fn();
    const onCancel = vi.fn();
    render(
      <SettlementTable
        settlements={[settlements[0]]}
        onExecute={onExecute}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Execute" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onExecute).toHaveBeenCalledWith(1);
    expect(onCancel).toHaveBeenCalledWith(1);
  });

  it("shows the amount and fee totals for the visible rows", () => {
    render(<SettlementTable settlements={settlements} />);

    const totalRow = screen.getByText("Total (visible rows)").closest("tr");
    expect(totalRow).not.toBeNull();
    expect(within(totalRow!).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Total (visible rows)",
      "600",
      "6",
      "",
    ]);
  });

  it("renders rows in their original order by default", () => {
    render(<SettlementTable settlements={settlements} />);
    expect(amountCells()).toEqual(["300", "100", "200"]);
  });

  it("sorts ascending by amount on the first click", () => {
    render(<SettlementTable settlements={settlements} />);
    fireEvent.click(screen.getByLabelText("Sort by Amount"));
    expect(amountCells()).toEqual(["100", "200", "300"]);
  });

  it("sorts descending by amount on a second click", () => {
    render(<SettlementTable settlements={settlements} />);
    fireEvent.click(screen.getByLabelText("Sort by Amount"));
    fireEvent.click(screen.getByLabelText("Sort by Amount"));
    expect(amountCells()).toEqual(["300", "200", "100"]);
  });

  it("sorts by status following canonical lifecycle order (pending -> executed -> cancelled)", () => {
    const statusSettlements: Settlement[] = [
      settlement({ id: 1, status: "executed" }),
      settlement({ id: 2, status: "cancelled" }),
      settlement({ id: 3, status: "pending" }),
    ];
    render(<SettlementTable settlements={statusSettlements} />);

    fireEvent.click(screen.getByLabelText("Sort by Status"));
    expect(statusCells()).toEqual(["Pending", "Executed", "Cancelled"]);

    fireEvent.click(screen.getByLabelText("Sort by Status"));
    expect(statusCells()).toEqual(["Cancelled", "Executed", "Pending"]);
  });

  it("applies a visible focus style to sortable header buttons", () => {
    render(<SettlementTable settlements={settlements} />);
    const sortButton = screen.getByLabelText("Sort by Amount");
    expect(sortButton).toHaveClass("focus-visible:border", "focus-visible:border-zinc-600");
  });

  it("exposes the current sort direction via aria-sort", () => {
    render(<SettlementTable settlements={settlements} />);
    const header = screen.getByLabelText("Sort by Amount").closest("th");
    expect(header).toHaveAttribute("aria-sort", "none");

    fireEvent.click(screen.getByLabelText("Sort by Amount"));
    expect(header).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByLabelText("Sort by Amount"));
    expect(header).toHaveAttribute("aria-sort", "descending");
  });
});
