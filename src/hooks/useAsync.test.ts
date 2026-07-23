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

    act(() => {
      void result.current.refresh();
    });
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
      let callCount = 0;

      const load = vi.fn().mockImplementation(
        (signal: AbortSignal) =>
          new Promise<string>((resolve, reject) => {
            callCount++;
            if (callCount === 1) {
              // First call: hang until aborted.
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

  it("resolves the refresh promise when the triggered fetch settles", async () => {
    let resolveSecond!: (value: string) => void;
    const load = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockImplementationOnce(
        () => new Promise<string>((resolve) => (resolveSecond = resolve)),
      );
    const { result } = renderHook(() => useAsync(load));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let settled = false;
    let refreshed!: Promise<void>;
    act(() => {
      refreshed = result.current.refresh().then(() => {
        settled = true;
      });
    });
    expect(settled).toBe(false);
    expect(result.current.state).toEqual({ status: "ready", data: "first" });

    await act(async () => {
      resolveSecond("second");
      await refreshed;
    });
    expect(settled).toBe(true);
    expect(result.current.state).toEqual({ status: "ready", data: "second" });
  });

  it("resolves the refresh promise even when the fetch fails", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useAsync(load));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    let refreshed!: Promise<void>;
    act(() => {
      refreshed = result.current.refresh();
    });
    await act(async () => refreshed);
    expect(result.current.state).toEqual({ status: "error", message: "boom" });
  });

  it("resolves a superseded refresh only when the newer fetch settles", async () => {
    let rejectSecond!: (err: Error) => void;
    let resolveThird!: (value: string) => void;
    const load = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockImplementationOnce(
        () => new Promise<string>((_, reject) => (rejectSecond = reject)),
      )
      .mockImplementationOnce(
        () => new Promise<string>((resolve) => (resolveThird = resolve)),
      );
    const { result } = renderHook(() => useAsync(load));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    // A second refresh aborts and replaces the still-pending first one.
    let firstSettled = false;
    act(() => {
      void result.current.refresh().then(() => {
        firstSettled = true;
      });
    });
    let secondRefresh!: Promise<void>;
    act(() => {
      secondRefresh = result.current.refresh();
    });
    expect(firstSettled).toBe(false);

    await act(async () => {
      resolveThird("third");
      await secondRefresh;
    });
    expect(firstSettled).toBe(true);
    expect(result.current.state).toEqual({ status: "ready", data: "third" });

    // The aborted fetch settling late (with the AbortError a real fetch
    // rejects with) must not surface an error or clobber the newer result.
    await act(async () => rejectSecond(new Error("The operation was aborted")));
    expect(result.current.state).toEqual({ status: "ready", data: "third" });
  });

  describe("ready initialState handling", () => {
    it("skips the initial load call on mount when seeded with a ready initialState", () => {
      const load = vi.fn().mockResolvedValue("fetched");
      const { result } = renderHook(() =>
        useAsync(load, { status: "ready", data: "initial" }),
      );

      expect(result.current.state).toEqual({
        status: "ready",
        data: "initial",
      });
      expect(load).not.toHaveBeenCalled();
    });

    it("triggers a fetch on explicit reload even when seeded with a ready initialState", async () => {
      const load = vi.fn().mockResolvedValue("reloaded");
      const { result } = renderHook(() =>
        useAsync(load, { status: "ready", data: "initial" }),
      );

      expect(load).not.toHaveBeenCalled();

      act(() => result.current.reload());
      expect(result.current.state.status).toBe("loading");

      await waitFor(() => {
        expect(result.current.state).toEqual({
          status: "ready",
          data: "reloaded",
        });
      });
      expect(load).toHaveBeenCalledTimes(1);
    });

    it("triggers a fetch on explicit refresh even when seeded with a ready initialState", async () => {
      const load = vi.fn().mockResolvedValue("refreshed");
      const { result } = renderHook(() =>
        useAsync(load, { status: "ready", data: "initial" }),
      );

      expect(load).not.toHaveBeenCalled();

      act(() => {
        void result.current.refresh();
      });
      expect(result.current.state.status).toBe("ready");

      await waitFor(() => {
        expect(result.current.state).toEqual({
          status: "ready",
          data: "refreshed",
        });
      });
      expect(load).toHaveBeenCalledTimes(1);
    });
  });
});
