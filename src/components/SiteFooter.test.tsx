import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("renders the footer tagline", () => {
    render(<SiteFooter />);
    expect(
      screen.getByText(/liquidity coordination for Stellar anchors/i),
    ).toBeInTheDocument();
  });

  it("renders the current year and a GitHub org link", () => {
    const year = new Date().getFullYear();
    render(<SiteFooter />);

    // Year is rendered
    expect(screen.getByText(new RegExp(String(year)))).toBeInTheDocument();

    // GitHub org link with safe attributes
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toHaveAttribute("href", "https://github.com/AnchorNet-Org");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a <footer> element so it inherits the Geist font from body", () => {
    render(<SiteFooter />);
    // The footer tag itself should be present; font inheritance is guaranteed
    // by layout.tsx applying font-sans (and the --font-geist-sans variable)
    // directly on <body> rather than relying on each page wrapper to re-apply it.
    const footer = document.querySelector("footer");
    expect(footer).toBeInTheDocument();
  });
});
