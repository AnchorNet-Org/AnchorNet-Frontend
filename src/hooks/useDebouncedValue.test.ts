import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 200));
    expect(result.current).toBe("a");
  });

  it("does not update until the delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("ab");
  });

  it("only emits the latest value when changes arrive within the delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    act(() => vi.advanceTimersByTime(100));
    rerender({ value: "abc" });
    act(() => vi.advanceTimersByTime(100));

    // The first change never settled because a newer one reset the timer.
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe("abc");
  });

  it("clears the pending timer on unmount", () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = renderHook(() => useDebouncedValue("a", 200));

    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("supports non-string values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: 1 } },
    );

    rerender({ value: 2 });
    act(() => vi.advanceTimersByTime(200));

    expect(result.current).toBe(2);
  });
});
