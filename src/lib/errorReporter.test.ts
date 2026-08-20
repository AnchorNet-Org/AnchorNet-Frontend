import { describe, it, expect, vi } from "vitest";
import { reportError } from "./errorReporter";
import { ApiRequestError } from "./api";

describe("reportError", () => {
  it("logs the error to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("test error");

    reportError(error);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("[ErrorReporter]", error);
    spy.mockRestore();
  });

  it("includes the route when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("test");

    reportError(error, { route: "/dashboard" });

    expect(spy).toHaveBeenCalledWith("[ErrorReporter] route=/dashboard", error);
    spy.mockRestore();
  });

  it("includes the requestId when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("test");

    reportError(error, { route: "/dashboard", requestId: "req-123" });

    expect(spy).toHaveBeenCalledWith(
      "[ErrorReporter] route=/dashboard requestId=req-123",
      error,
    );
    spy.mockRestore();
  });

  it("handles non-Error values", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = "string error";

    reportError(error);

    expect(spy).toHaveBeenCalledWith("[ErrorReporter]", "string error");
    spy.mockRestore();
  });

  it("does not report deliberate aborts", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    reportError(new DOMException("aborted", "AbortError"));

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("adds structured API failure metadata", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new ApiRequestError(
      503,
      "UNAVAILABLE",
      "temporarily unavailable",
      "req-api",
      { attempts: 3 },
    );

    reportError(error, { route: "/dashboard" });

    expect(spy).toHaveBeenCalledWith(
      "[ErrorReporter] route=/dashboard requestId=req-api kind=server status=503 code=UNAVAILABLE attempts=3",
      error,
    );
    spy.mockRestore();
  });
});
