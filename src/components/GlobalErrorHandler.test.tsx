import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { GlobalErrorHandler } from "./GlobalErrorHandler";

describe("GlobalErrorHandler", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("listens for unhandledrejection and error events", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    render(<GlobalErrorHandler />);

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });

  it("reports unhandled promise rejections", () => {
    render(<GlobalErrorHandler />);

    const error = new Error("promise failed");
    const promise = Promise.reject(error);
    promise.catch(() => {});
    const event = new PromiseRejectionEvent("unhandledrejection", {
      reason: error,
      promise,
    });

    window.dispatchEvent(event);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[ErrorReporter]"),
      error,
    );
  });

  it("reports non-Error rejections as a string", () => {
    render(<GlobalErrorHandler />);

    const promise = Promise.reject("plain string rejection");
    promise.catch(() => {});
    const event = new PromiseRejectionEvent("unhandledrejection", {
      reason: "plain string rejection",
      promise,
    });

    window.dispatchEvent(event);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[ErrorReporter]"),
      expect.objectContaining({ message: "plain string rejection" }),
    );
  });

  it("reports synchronous window errors", () => {
    render(<GlobalErrorHandler />);

    const error = new Error("sync error");
    const event = new ErrorEvent("error", {
      error,
      message: error.message,
    });

    window.dispatchEvent(event);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[ErrorReporter]"),
      error,
    );
  });

  it("reports missing Error objects from error events as string messages", () => {
    render(<GlobalErrorHandler />);

    const event = new ErrorEvent("error", {
      message: "script error",
    });

    window.dispatchEvent(event);

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[ErrorReporter]"),
      expect.objectContaining({ message: "script error" }),
    );
  });

  it("removes the listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<GlobalErrorHandler />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "unhandledrejection",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });
});
