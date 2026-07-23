import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { CopyButton } from "./CopyButton";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("CopyButton", () => {
  it("copies the given text to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<CopyButton text="GABC123" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("GABC123"));
  });

  it("shows brief 'Copied' feedback and announces via live region after a successful copy", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<CopyButton text="GABC123" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(await screen.findByText("Copied")).toBeInTheDocument();
    const liveRegion = screen.getByText("Copied to clipboard");
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
  });

  it("resets 'Copied' feedback and live region announcement after 1500ms", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<CopyButton text="GABC123" label="Copy" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Copied")).toBeInTheDocument();
    expect(screen.getByText("Copied to clipboard")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
    expect(screen.queryByText("Copied to clipboard")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("resets 'Copied' feedback after 1500ms", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<CopyButton text="GABC123" label="Copy" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByText("Copied")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("clears reset timer on unmount and prevents state update after unmount", async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    const { unmount } = render(<CopyButton text="GABC123" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Copied")).toBeInTheDocument();

    unmount();

    expect(clearSpy).toHaveBeenCalled();

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }).not.toThrow();
  });

  it("fails silently when the clipboard write is rejected", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    render(<CopyButton text="GABC123" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    // No error thrown/unhandled and the button still shows its default label.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    });
  });
});
