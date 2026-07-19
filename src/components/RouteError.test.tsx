import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteError } from "./RouteError";

describe("RouteError", () => {
  it("renders a default title unless overridden", () => {
    render(<RouteError error={new Error("boom")} reset={() => {}} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a custom title when provided", () => {
    render(
      <RouteError
        error={new Error("boom")}
        reset={() => {}}
        title="Could not load anchor"
      />,
    );
    expect(screen.getByText("Could not load anchor")).toBeInTheDocument();
  });

  it("renders the error message", () => {
    render(<RouteError error={new Error("Network request failed")} reset={() => {}} />);
    expect(screen.getByText("Network request failed")).toBeInTheDocument();
  });

  it("falls back to a generic message when the error has none", () => {
    render(<RouteError error={new Error("")} reset={() => {}} />);
    expect(
      screen.getByText("An unexpected error occurred."),
    ).toBeInTheDocument();
  });

  it("calls reset when 'Try again' is clicked", () => {
    const reset = vi.fn();
    render(<RouteError error={new Error("boom")} reset={reset} />);
    fireEvent.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  describe("'Try again' uses the retry callback, not a full page reload", () => {
    let reloadMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Stub window.location.reload so we can assert it is never called.
      reloadMock = vi.fn();
      vi.stubGlobal("location", { ...window.location, reload: reloadMock });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("invokes the reset callback on click", () => {
      const reset = vi.fn();
      render(<RouteError error={new Error("oops")} reset={reset} />);
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(reset).toHaveBeenCalledTimes(1);
    });

    it("does NOT call window.location.reload on click", () => {
      const reset = vi.fn();
      render(<RouteError error={new Error("oops")} reset={reset} />);
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(reloadMock).not.toHaveBeenCalled();
    });
  });
});
