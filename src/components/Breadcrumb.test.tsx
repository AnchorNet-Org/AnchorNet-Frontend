import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("renders a nav landmark with the accessible label", () => {
    render(
      <Breadcrumb
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Item" }]}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeInTheDocument();
  });

  it("renders intermediate items as links pointing to the correct hrefs", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Anchors", href: "/anchors" },
          { label: "anchor-123" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Anchors" })).toHaveAttribute(
      "href",
      "/anchors",
    );
  });

  it("renders the last item as plain text with aria-current='page'", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "anchor-123" },
        ]}
      />,
    );

    const current = screen.getByText("anchor-123");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).not.toBe("A");
  });

  it("does not render the last item as a link even when href is provided", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Anchors", href: "/anchors" },
        ]}
      />,
    );

    // Last item "Anchors" should be aria-current=page, not a link
    const current = screen.getByText("Anchors");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).not.toBe("A");
  });

  it("renders separator characters between items", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Anchors", href: "/anchors" },
          { label: "anchor-123" },
        ]}
      />,
    );

    // Two separators for three items
    const separators = container.querySelectorAll("[aria-hidden='true']");
    expect(separators).toHaveLength(2);
  });

  it("renders a single-item breadcrumb without any separators or links", () => {
    const { container } = render(
      <Breadcrumb items={[{ label: "Anchors" }]} />,
    );

    expect(screen.getByText("Anchors")).toHaveAttribute("aria-current", "page");
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  // Anchor detail page breadcrumb shape
  it("renders the correct links for an anchor detail breadcrumb", () => {
    const anchorId = "GBXY1234";
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Anchors", href: "/anchors" },
          { label: anchorId },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Anchors" })).toHaveAttribute(
      "href",
      "/anchors",
    );
    expect(screen.getByText(anchorId)).toHaveAttribute("aria-current", "page");
  });

  // Settlement detail page breadcrumb shape
  it("renders the correct links for a settlement detail breadcrumb", () => {
    const settlementId = "42";
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settlements", href: "/settlements" },
          { label: settlementId },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(
      screen.getByRole("link", { name: "Settlements" }),
    ).toHaveAttribute("href", "/settlements");
    expect(screen.getByText(settlementId)).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
