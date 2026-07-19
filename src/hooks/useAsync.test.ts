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
});
