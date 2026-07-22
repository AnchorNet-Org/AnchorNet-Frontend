import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SkipToContentLink } from "./SkipToContentLink";

describe("SkipToContentLink", () => {
  it("targets and moves focus to the main content region", () => {
    render(
      <>
        <SkipToContentLink />
        <main id="main-content" tabIndex={-1}>Page content</main>
      </>,
    );

    const skipLink = screen.getByRole("link", { name: /skip to main content/i });
    const main = screen.getByRole("main");

    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(skipLink).toHaveClass("sr-only", "focus:not-sr-only");
    expect(skipLink.compareDocumentPosition(main)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    fireEvent.click(skipLink);

    expect(main).toHaveFocus();
  });
});
