import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SettlementsLoading from "./loading";

vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

describe("SettlementsLoading", () => {
  it("renders the six-column table loading fallback", () => {
    const { container } = render(<SettlementsLoading />);

    expect(screen.getByRole("status", { name: "Loading table data" })).toBeInTheDocument();
    expect(container.querySelector('[role="status"] > div')?.children).toHaveLength(6);
  });
});
