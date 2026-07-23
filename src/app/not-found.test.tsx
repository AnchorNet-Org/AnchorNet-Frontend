import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { WalletProvider } from "@/components/WalletProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound, { metadata } from "./not-found";

function renderNotFound() {
  return render(
    <WalletProvider>
      <ThemeProvider>
        <NotFound />
      </ThemeProvider>
    </WalletProvider>,
  );
}

describe("NotFound", () => {
  it("uses an en dash in the page title", () => {
    expect(metadata.title).toBe("Page not found – AnchorNet");
  });

  it("renders a 404 message with a link back home", () => {
    renderNotFound();

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to home/i }),
    ).toHaveAttribute("href", "/");
  });

  it("renders secondary links to Dashboard, Anchors, and Settlements", () => {
    renderNotFound();

    const nav = screen.getByRole("navigation", { name: /other destinations/i });

    expect(
      within(nav).getByRole("link", { name: /dashboard/i }),
    ).toHaveAttribute("href", "/dashboard");
    expect(
      within(nav).getByRole("link", { name: /anchors/i }),
    ).toHaveAttribute("href", "/anchors");
    expect(
      within(nav).getByRole("link", { name: /settlements/i }),
    ).toHaveAttribute("href", "/settlements");
  });
});