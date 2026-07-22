import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AnchorTable } from "./AnchorTable";
import { Anchor } from "@/lib/types";

function anchor(overrides: Partial<Anchor>): Anchor {
  return {
    id: "a",
    name: "A",
    registeredAt: "2024-01-01T00:00:00.000Z",
    active: true,
    ...overrides,
  };
}

const anchors: Anchor[] = [
  anchor({ id: "c", name: "Charlie", registeredAt: "2024-03-01T00:00:00.000Z" }),
  anchor({ id: "a", name: "Alpha", registeredAt: "2024-01-01T00:00:00.000Z" }),
  anchor({ id: "b", name: "Bravo", registeredAt: "2024-02-01T00:00:00.000Z" }),
];

function nameCells() {
  const rows = screen.getAllByRole("row").slice(1); // skip the header row
  return rows.map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("AnchorTable", () => {
  it("renders an empty state when there are no anchors", () => {
    render(<AnchorTable anchors={[]} />);
    expect(screen.getByText("No anchors registered yet.")).toBeInTheDocument();
  });

  it("renders rows in their original order by default", () => {
    render(<AnchorTable anchors={anchors} />);
    expect(nameCells()).toEqual([
      "Charliec",
      "Alphaa",
      "Bravob",
    ]);
  });

  it("sorts ascending by anchor name on the first click", () => {
    render(<AnchorTable anchors={anchors} />);
    fireEvent.click(screen.getByLabelText("Sort by Anchor"));
    expect(nameCells()).toEqual(["Alphaa", "Bravob", "Charliec"]);
  });

  it("sorts descending by registered date on a second click", () => {
    render(<AnchorTable anchors={anchors} />);
    fireEvent.click(screen.getByLabelText("Sort by Registered"));
    fireEvent.click(screen.getByLabelText("Sort by Registered"));
    expect(nameCells()).toEqual(["Charliec", "Bravob", "Alphaa"]);
  });

  it("applies a visible focus style to sortable header buttons", () => {
    render(<AnchorTable anchors={anchors} />);
    const sortButton = screen.getByLabelText("Sort by Anchor");
    expect(sortButton).toHaveClass("focus-visible:border", "focus-visible:border-zinc-600");
  });

  it("exposes the current sort direction via aria-sort", () => {
    render(<AnchorTable anchors={anchors} />);
    const header = screen.getByLabelText("Sort by Anchor").closest("th");
    expect(header).toHaveAttribute("aria-sort", "none");

    fireEvent.click(screen.getByLabelText("Sort by Anchor"));
    expect(header).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByLabelText("Sort by Anchor"));
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("only shows a deactivate button for active anchors when onDeregister is passed", () => {
    render(
      <AnchorTable
        anchors={[anchor({ id: "x", active: true }), anchor({ id: "y", active: false })]}
        onDeregister={() => {}}
      />,
    );
    expect(screen.getAllByText("Deactivate")).toHaveLength(1);
  });

  describe("initial aria-sort accessibility", () => {
    it("announces all column headers as aria-sort=none on initial render", () => {
      render(<AnchorTable anchors={anchors} />);

      const nameHeader = screen.getByLabelText("Sort by Anchor").closest("th");
      const registeredHeader = screen
        .getByLabelText("Sort by Registered")
        .closest("th");
      const statusHeader = screen.getByLabelText("Sort by Status").closest("th");

      expect(nameHeader).toHaveAttribute("aria-sort", "none");
      expect(registeredHeader).toHaveAttribute("aria-sort", "none");
      expect(statusHeader).toHaveAttribute("aria-sort", "none");
    });

    it("updates aria-sort to ascending on first column click", () => {
      render(<AnchorTable anchors={anchors} />);
      const header = screen.getByLabelText("Sort by Anchor").closest("th");

      expect(header).toHaveAttribute("aria-sort", "none");

      fireEvent.click(screen.getByLabelText("Sort by Anchor"));
      expect(header).toHaveAttribute("aria-sort", "ascending");
    });

    it("updates aria-sort to descending on second column click", () => {
      render(<AnchorTable anchors={anchors} />);
      const header = screen.getByLabelText("Sort by Anchor").closest("th");

      fireEvent.click(screen.getByLabelText("Sort by Anchor"));
      fireEvent.click(screen.getByLabelText("Sort by Anchor"));
      expect(header).toHaveAttribute("aria-sort", "descending");
    });

    it("resets aria-sort to none on third column click", () => {
      render(<AnchorTable anchors={anchors} />);
      const header = screen.getByLabelText("Sort by Anchor").closest("th");

      fireEvent.click(screen.getByLabelText("Sort by Anchor"));
      fireEvent.click(screen.getByLabelText("Sort by Anchor"));
      fireEvent.click(screen.getByLabelText("Sort by Anchor"));
      expect(header).toHaveAttribute("aria-sort", "none");
    });

    it("switches aria-sort between columns when clicking different headers", () => {
      render(<AnchorTable anchors={anchors} />);
      const nameHeader = screen.getByLabelText("Sort by Anchor").closest("th");
      const registeredHeader = screen
        .getByLabelText("Sort by Registered")
        .closest("th");

      // Click Anchor (first sort)
      fireEvent.click(screen.getByLabelText("Sort by Anchor"));
      expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
      expect(registeredHeader).toHaveAttribute("aria-sort", "none");

      // Click Registered (switches to that column, ascending)
      fireEvent.click(screen.getByLabelText("Sort by Registered"));
      expect(nameHeader).toHaveAttribute("aria-sort", "none");
      expect(registeredHeader).toHaveAttribute("aria-sort", "ascending");
    });
  });
});
