import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SettlementTable } from "./SettlementTable";
import { Settlement } from "@/lib/types";
import { formatAmount } from "@/lib/format";

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

    const table = within(document.querySelector("table")!);
    fireEvent.click(table.getByRole("button", { name: "Execute" }));
    fireEvent.click(table.getByRole("button", { name: "Cancel" }));

    expect(onExecute).toHaveBeenCalledWith(1);
    expect(onCancel).toHaveBeenCalledWith(1);
  });

  it("shows the amount and fee totals for the visible rows", () => {
    render(<SettlementTable settlements={settlements} />);

    const totalRow = within(screen.getByRole("table")).getByRole("row", {
      name: /Total \(visible rows\)/,
    });
    expect(within(totalRow).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
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

  it("resets an active sort directly to the original row order", () => {
    render(<SettlementTable settlements={settlements} />);
    const header = screen.getByLabelText("Sort by Amount").closest("th");

    expect(screen.queryByRole("button", { name: "Reset sort" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Sort by Amount"));
    expect(amountCells()).toEqual(["100", "200", "300"]);

    fireEvent.click(screen.getByRole("button", { name: "Reset sort" }));
    expect(amountCells()).toEqual(["300", "100", "200"]);
    expect(header).toHaveAttribute("aria-sort", "none");
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

  it("announces the new sort key and direction via a live region when clicked", () => {
    const { container } = render(<SettlementTable settlements={settlements} />);

    // No announcement on initial render
    const liveRegion = container.querySelector('[aria-live="polite"].sr-only');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveTextContent("");

    // Click to sort by Amount
    fireEvent.click(screen.getByLabelText("Sort by Amount"));
    expect(liveRegion).toHaveTextContent("Sorted by Amount, ascending");

    // Click again to cycle to descending
    fireEvent.click(screen.getByLabelText("Sort by Amount"));
    expect(liveRegion).toHaveTextContent("Sorted by Amount, descending");

    // Click again to cycle to unsorted
    fireEvent.click(screen.getByLabelText("Sort by Amount"));
    expect(liveRegion).toHaveTextContent("Sorting cleared");
  });

  describe("initial aria-sort accessibility", () => {
    it("announces all column headers as aria-sort=none on initial render", () => {
      render(<SettlementTable settlements={settlements} />);

      const anchorHeader = screen.getByLabelText("Sort by Anchor").closest("th");
      const amountHeader = screen.getByLabelText("Sort by Amount").closest("th");
      const statusHeader = screen.getByLabelText("Sort by Status").closest("th");

      expect(anchorHeader).toHaveAttribute("aria-sort", "none");
      expect(amountHeader).toHaveAttribute("aria-sort", "none");
      expect(statusHeader).toHaveAttribute("aria-sort", "none");
    });

    it("updates aria-sort to ascending on first column click", () => {
      render(<SettlementTable settlements={settlements} />);
      const header = screen.getByLabelText("Sort by Amount").closest("th");

      expect(header).toHaveAttribute("aria-sort", "none");

      fireEvent.click(screen.getByLabelText("Sort by Amount"));
      expect(header).toHaveAttribute("aria-sort", "ascending");
    });

    it("updates aria-sort to descending on second column click", () => {
      render(<SettlementTable settlements={settlements} />);
      const header = screen.getByLabelText("Sort by Amount").closest("th");

      fireEvent.click(screen.getByLabelText("Sort by Amount"));
      fireEvent.click(screen.getByLabelText("Sort by Amount"));
      expect(header).toHaveAttribute("aria-sort", "descending");
    });

    it("resets aria-sort to none on third column click", () => {
      render(<SettlementTable settlements={settlements} />);
      const header = screen.getByLabelText("Sort by Amount").closest("th");

      fireEvent.click(screen.getByLabelText("Sort by Amount"));
      fireEvent.click(screen.getByLabelText("Sort by Amount"));
      fireEvent.click(screen.getByLabelText("Sort by Amount"));
      expect(header).toHaveAttribute("aria-sort", "none");
    });

    it("switches aria-sort between columns when clicking different headers", () => {
      render(<SettlementTable settlements={settlements} />);
      const anchorHeader = screen.getByLabelText("Sort by Anchor").closest("th");
      const amountHeader = screen.getByLabelText("Sort by Amount").closest("th");

      // Click Anchor (first sort)
      fireEvent.click(screen.getByLabelText("Sort by Anchor"));
      expect(anchorHeader).toHaveAttribute("aria-sort", "ascending");
      expect(amountHeader).toHaveAttribute("aria-sort", "none");

      // Click Amount (switches to that column, ascending)
      fireEvent.click(screen.getByLabelText("Sort by Amount"));
      expect(anchorHeader).toHaveAttribute("aria-sort", "none");
      expect(amountHeader).toHaveAttribute("aria-sort", "ascending");
    });
  });
});

describe("SettlementTable per-row in-flight actions", () => {
  it("disables Execute and Cancel buttons only for pending settlement IDs", () => {
    const onExecute = () => {};
    const onCancel = () => {};
    render(
      <SettlementTable
        settlements={settlements}
        onExecute={onExecute}
        onCancel={onCancel}
        pendingIds={new Set([2])}
      />,
    );

    const rows = within(document.querySelector("tbody")!).getAllByRole("row");
    const row1Execute = within(rows[0]).getByRole("button", { name: "Execute" });
    const row1Cancel = within(rows[0]).getByRole("button", { name: "Cancel" });

    const row2Execute = within(rows[1]).getByRole("button", { name: "Execute" });
    const row2Cancel = within(rows[1]).getByRole("button", { name: "Cancel" });

    const row3Execute = within(rows[2]).getByRole("button", { name: "Execute" });
    const row3Cancel = within(rows[2]).getByRole("button", { name: "Cancel" });

    expect(row1Execute).not.toBeDisabled();
    expect(row1Cancel).not.toBeDisabled();

    expect(row2Execute).toBeDisabled();
    expect(row2Cancel).toBeDisabled();

    expect(row3Execute).not.toBeDisabled();
    expect(row3Cancel).not.toBeDisabled();
  });
});

describe("SettlementTable mobile layout", () => {
  it("renders a card for each settlement with correct data", () => {
    render(<SettlementTable settlements={settlements} />);
    const cards = screen.getAllByTestId("settlement-card");
    expect(cards).toHaveLength(settlements.length);
    settlements.forEach((s, index) => {
      const card = cards[index];
      expect(within(card).getByText(`Settlement #${s.id}`)).toBeInTheDocument();
      expect(within(card).getByText(s.anchor)).toBeInTheDocument();
      expect(within(card).getByText(s.asset)).toBeInTheDocument();
      expect(within(card).getByText(formatAmount(s.amount))).toBeInTheDocument();
      expect(within(card).getByText(formatAmount(s.fee))).toBeInTheDocument();
    });
  });
});
