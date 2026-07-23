import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageShell } from "./PageShell";

vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

describe("PageShell", () => {
  it("renders children inside the main landmark", () => {
    render(<PageShell><p>Hello world</p></PageShell>);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders a <main> element (landmark role)", () => {
    render(<PageShell><span>content</span></PageShell>);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it('sets id="main-content" on the <main> element for SkipToContentLink', () => {
    render(<PageShell><span>content</span></PageShell>);

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("sets tabIndex={-1} on <main> so SkipToContentLink focus target works", () => {
    render(<PageShell><span>content</span></PageShell>);

    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it("applies the default max-w-4xl width class", () => {
    render(<PageShell><span>content</span></PageShell>);

    expect(screen.getByRole("main")).toHaveClass("max-w-4xl");
  });

  it("applies a custom maxWidth when provided", () => {
    render(<PageShell maxWidth="max-w-5xl"><span>content</span></PageShell>);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("max-w-5xl");
    expect(main).not.toHaveClass("max-w-4xl");
  });

  it("applies the default py-12 vertical padding", () => {
    render(<PageShell><span>content</span></PageShell>);

    expect(screen.getByRole("main")).toHaveClass("py-12");
  });

  it("applies a custom py when provided", () => {
    render(<PageShell py="py-24"><span>content</span></PageShell>);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("py-24");
    expect(main).not.toHaveClass("py-12");
  });

  it("applies extra className to <main> when provided", () => {
    render(
      <PageShell className="flex flex-col items-center text-center">
        <span>content</span>
      </PageShell>,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveClass("flex");
    expect(main).toHaveClass("flex-col");
    expect(main).toHaveClass("items-center");
    expect(main).toHaveClass("text-center");
  });

  it("always applies mx-auto and px-6", () => {
    render(<PageShell><span>content</span></PageShell>);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("mx-auto");
    expect(main).toHaveClass("px-6");
  });

  it("renders the SiteHeader", () => {
    render(<PageShell><span>content</span></PageShell>);

    expect(screen.getByTestId("site-header")).toBeInTheDocument();
  });

  it("renders the outer div with full-screen dark theme classes", () => {
    const { container } = render(<PageShell><span>content</span></PageShell>);

    const outer = container.firstElementChild as HTMLElement;
    expect(outer).toHaveClass("min-h-screen");
    expect(outer).toHaveClass("bg-zinc-950");
    expect(outer).toHaveClass("text-zinc-100");
    expect(outer).toHaveClass("font-sans");
  });

  it("does not produce a className with leading or trailing spaces", () => {
    render(<PageShell><span>content</span></PageShell>);

    const main = screen.getByRole("main");
    expect(main.className).toBe(main.className.trim());
  });

  it("accepts both maxWidth, py, and className together", () => {
    render(
      <PageShell maxWidth="max-w-3xl" py="py-24" className="flex flex-col items-center text-center">
        <span>content</span>
      </PageShell>,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveClass("max-w-3xl");
    expect(main).toHaveClass("py-24");
    expect(main).toHaveClass("flex");
    expect(main).toHaveClass("items-center");
  });
});
