import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteError } from "./RouteError";
import * as errorReporter from "@/lib/errorReporter";

const mockReportError = vi.spyOn(errorReporter, "reportError").mockImplementation(() => {});

vi.mock("next/navigation", () => ({
  usePathname: () => "/test-route",
}));

describe("RouteError", () => {
  beforeEach(() => {
    mockReportError.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports the error via the error reporter on mount", () => {
    const error = new Error("boom");
    render(<RouteError error={error} reset={() => {}} />);

    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith(error, {
      route: "/test-route",
      requestId: undefined,
    });
  });

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

  it("renders the error digest when present", () => {
    const error = new Error("Server error occurred") as Error & { digest: string };
    error.digest = "NEXT_JS_DIGEST_123";
    render(<RouteError error={error} reset={() => {}} />);
    expect(screen.getByText("Reference: NEXT_JS_DIGEST_123")).toBeInTheDocument();
  });

  it("does not render reference line when error digest is absent", () => {
    const error = new Error("Client error occurred");
    render(<RouteError error={error} reset={() => {}} />);
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
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

  describe("support link", () => {
    it("renders a link to the GitHub issues page", () => {
      render(<RouteError error={new Error("boom")} reset={() => {}} />);
      const link = screen.getByRole("link", { name: /still having trouble\? report an issue/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "https://github.com/AnchorNet-Org/issues");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders the link regardless of the variant/title provided", () => {
      render(<RouteError error={new Error("boom")} reset={() => {}} title="Custom Error Title" />);
      const link = screen.getByRole("link", { name: /still having trouble\? report an issue/i });
      expect(link).toBeInTheDocument();
    });
  });
});

