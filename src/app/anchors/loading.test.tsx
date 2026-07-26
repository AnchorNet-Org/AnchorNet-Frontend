import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AnchorsLoading from "./loading";

vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

describe("AnchorsLoading", () => {
  it("renders the three-column table loading fallback", () => {
    const { container } = render(<AnchorsLoading />);

    expect(screen.getByRole("status", { name: "Loading table data" })).toBeInTheDocument();
    expect(container.querySelector('[role="status"] > div')?.children).toHaveLength(3);
  });
});
