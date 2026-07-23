import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardLoading from "./loading";

vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

describe("DashboardLoading", () => {
  it("renders the corrected dashboard loading label", () => {
    render(<DashboardLoading />);

    expect(screen.getByText("Loading dashboard…")).toBeInTheDocument();
  });
});
