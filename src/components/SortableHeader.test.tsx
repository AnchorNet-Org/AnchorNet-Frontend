import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SortState } from "@/hooks/useSortableData";
import { SortableHeader } from "./SortableHeader";

type SortKey = "asset" | "amount";

function renderHeader(
  sort: SortState<SortKey> | null,
  onSort = vi.fn<(key: SortKey) => void>(),
) {
  render(
    <table>
      <thead>
        <tr>
          <SortableHeader
            label="Asset"
            sortKey="asset"
            sort={sort}
            onSort={onSort}
          />
        </tr>
      </thead>
    </table>,
  );

  return onSort;
}

describe("SortableHeader", () => {
  it("is unsorted and exposes an accessible sort control when no sort is active", () => {
    renderHeader(null);

    expect(screen.getByRole("columnheader")).toHaveAttribute(
      "aria-sort",
      "none",
    );
    expect(
      screen.getByRole("button", { name: "Sort by Asset" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("▲")).not.toBeInTheDocument();
    expect(screen.queryByText("▼")).not.toBeInTheDocument();
  });

  it("treats a different active sort key as inactive", () => {
    renderHeader({ key: "amount", direction: "asc" });

    expect(screen.getByRole("columnheader")).toHaveAttribute(
      "aria-sort",
      "none",
    );
    expect(screen.queryByText("▲")).not.toBeInTheDocument();
  });

  it("announces and indicates ascending order", () => {
    renderHeader({ key: "asset", direction: "asc" });

    expect(screen.getByRole("columnheader")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(screen.getByText("▲")).toBeInTheDocument();
    expect(screen.queryByText("▼")).not.toBeInTheDocument();
  });

  it("announces and indicates descending order", () => {
    renderHeader({ key: "asset", direction: "desc" });

    expect(screen.getByRole("columnheader")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(screen.getByText("▼")).toBeInTheDocument();
    expect(screen.queryByText("▲")).not.toBeInTheDocument();
  });

  it("passes the configured key to the sort callback", () => {
    const onSort = renderHeader(null);

    fireEvent.click(screen.getByRole("button", { name: "Sort by Asset" }));

    expect(onSort).toHaveBeenCalledOnce();
    expect(onSort).toHaveBeenCalledWith("asset");
  });
});
