import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the provided message", () => {
    render(<EmptyState message="No anchors registered yet." />);
    expect(screen.getByText("No anchors registered yet.")).toBeInTheDocument();
  });

  it("does not offer a clear-filters action for the no-data variant", () => {
    render(
      <EmptyState
        message="No anchors registered yet."
        onClearFilters={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("offers a clear-filters action for the no-results variant", () => {
    const onClearFilters = vi.fn();
    render(
      <EmptyState
        reason="no-results"
        message="No anchors match your search or filter."
        onClearFilters={onClearFilters}
      />,
    );

    expect(
      screen.getByText("No anchors match your search or filter."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("renders the no-results variant without an action when no handler is given", () => {
    render(<EmptyState reason="no-results" message="No results." />);
    expect(screen.getByText("No results.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });
});
