import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnchorDetailLoading from "./loading";

vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));

describe("AnchorDetailLoading", () => {
  it("renders a card-based loading skeleton with the detail page back link", () => {
    render(<AnchorDetailLoading />);

    expect(screen.getByRole("link", { name: /back to anchors/i })).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: /loading anchor detail/i }),
    ).toBeInTheDocument();
  });
});
