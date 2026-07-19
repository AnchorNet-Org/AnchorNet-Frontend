import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAsync } from "./useAsync";

describe("useAsync", () => {
  it("starts in the loading state and resolves to ready", async () => {
    const { result } = renderHook(() => useAsync(async () => "data"));

    expect(result.current.state.status).toBe("loading");

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: "ready", data: "data" });
    });
  });

  it("surfaces a rejected loader as an error state", async () => {
    const { result } = renderHook(() =>
      useAsync(async () => {
        throw new Error("boom");
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "error",
        message: "boom",
      });
    });
  });

  it("reload re-runs the loader and shows loading again", async () => {
    const load = vi.fn().mockResolvedValue("value");
    const { result } = renderHook(() => useAsync(load));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.reload());
    expect(result.current.state.status).toBe("loading");

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("refresh re-runs the loader without showing a loading state", async () => {
    const load = vi.fn().mockResolvedValue("value");
    const { result } = renderHook(() => useAsync(load));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.refresh());
    expect(result.current.state.status).toBe("ready");

    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });

  describe("abort handling — deliberate cancellations never produce an error state", () => {
    it("does not set error state when the hook unmounts mid-flight", async () => {
      // The loader hangs until the signal fires, then rejects with AbortError —
      // exactly what fetch does when its signal is aborted.
      const load = vi.fn().mockImplementation(
        (signal: AbortSignal) =>
          new Promise<string>((_, reject) => {
            signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      );

      const { result, unmount } = renderHook(() => useAsync(load));

      // Still loading — no data yet.
      expect(result.current.state.status).toBe("loading");

      // Unmounting aborts the in-flight request via the controller.
      unmount();

      // Give microtasks a chance to flush; the state must never become "error".
      await new Promise((r) => setTimeout(r, 0));
      expect(result.current.state.status).toBe("loading");
    });

    it("does not set error state when reload aborts the previous request", async () => {
      let resolveFirst!: (v: string) => void;
      let callCount = 0;

      const load = vi.fn().mockImplementation(
        (signal: AbortSignal) =>
          new Promise<string>((resolve, reject) => {
            callCount++;
            if (callCount === 1) {
              // First call: hang until aborted.
              resolveFirst = resolve;
              signal.addEventListener("abort", () =>
                reject(new DOMException("aborted", "AbortError")),
              );
            } else {
              // Second call: resolve immediately.
              resolve("new-data");
            }
          }),
      );

      const { result } = renderHook(() => useAsync(load));
      expect(result.current.state.status).toBe("loading");

      // Trigger reload — this aborts the first request and starts a second.
      act(() => result.current.reload());

      // Let the second call resolve.
      await waitFor(() =>
        expect(result.current.state).toEqual({
          status: "ready",
          data: "new-data",
        }),
      );

      // The aborted first request must not have set an error state.
      expect(result.current.state.status).toBe("ready");
    });

    it("still surfaces a genuine network error as error state", async () => {
      const { result } = renderHook(() =>
        useAsync(async () => {
          throw new Error("Network request failed");
        }),
      );

      await waitFor(() => {
        expect(result.current.state).toEqual({
          status: "error",
          message: "Network request failed",
        });
      });
    });
  });
});
