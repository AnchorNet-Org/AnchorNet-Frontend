import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQueryState } from "./useQueryState";

// ---------------------------------------------------------------------------
// Mock next/navigation
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();
let mockSearchParamsString = "";
let mockPathname = "/anchors";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsString = "";
  mockPathname = "/anchors";
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useQueryState", () => {
  it("returns the fallback when the param is absent", () => {
    mockSearchParamsString = "";
    const { result } = renderHook(() => useQueryState("q", ""));
    expect(result.current[0]).toBe("");
  });

  it("hydrates the value from the URL on initial render", () => {
    mockSearchParamsString = "q=stellar";
    const { result } = renderHook(() => useQueryState("q", ""));
    expect(result.current[0]).toBe("stellar");
  });

  it("hydrates a non-default param from the URL", () => {
    mockSearchParamsString = "status=active";
    const { result } = renderHook(() => useQueryState("status", "all"));
    expect(result.current[0]).toBe("active");
  });

  it("returns 'all' when status param equals the fallback", () => {
    mockSearchParamsString = "status=all";
    const { result } = renderHook(() => useQueryState("status", "all"));
    // 'all' is the fallback so the hook accepts it as the current value
    expect(result.current[0]).toBe("all");
  });

  it("updates local state immediately when set is called", () => {
    mockSearchParamsString = "";
    const { result } = renderHook(() => useQueryState("q", ""));
    act(() => {
      result.current[1]("foo");
    });
    expect(result.current[0]).toBe("foo");
  });

  it("calls router.replace with the new param when set is invoked", () => {
    mockSearchParamsString = "";
    const { result } = renderHook(() => useQueryState("q", ""));
    act(() => {
      result.current[1]("foo");
    });
    expect(mockReplace).toHaveBeenCalledOnce();
    expect(mockReplace).toHaveBeenCalledWith("/anchors?q=foo", {
      scroll: false,
    });
  });

  it("removes the param from the URL when set is called with an empty string", () => {
    mockSearchParamsString = "q=foo";
    const { result } = renderHook(() => useQueryState("q", ""));
    act(() => {
      result.current[1]("");
    });
    expect(mockReplace).toHaveBeenCalledWith("/anchors", { scroll: false });
  });

  it("removes the param from the URL when set to the explicit fallback value", () => {
    mockSearchParamsString = "status=active";
    const { result } = renderHook(() => useQueryState("status", "all"));
    act(() => {
      result.current[1]("all");
    });
    // 'all' === fallback so the param should be deleted
    expect(mockReplace).toHaveBeenCalledWith("/anchors", { scroll: false });
  });

  it("preserves other existing params when setting a new one", () => {
    mockSearchParamsString = "status=active";
    const { result } = renderHook(() => useQueryState("q", ""));
    act(() => {
      result.current[1]("vault");
    });
    expect(mockReplace).toHaveBeenCalledWith("/anchors?status=active&q=vault", {
      scroll: false,
    });
  });

  it("preserves other existing params when removing one", () => {
    mockSearchParamsString = "status=active&q=foo";
    const { result } = renderHook(() => useQueryState("q", ""));
    act(() => {
      result.current[1]("");
    });
    expect(mockReplace).toHaveBeenCalledWith("/anchors?status=active", {
      scroll: false,
    });
  });

  it("uses the current pathname from usePathname", () => {
    mockPathname = "/settlements";
    mockSearchParamsString = "";
    const { result } = renderHook(() => useQueryState("q", ""));
    act(() => {
      result.current[1]("bar");
    });
    expect(mockReplace).toHaveBeenCalledWith("/settlements?q=bar", {
      scroll: false,
    });
  });

  it("updates returned value when searchParams changes externally without calling setter", () => {
    mockSearchParamsString = "q=initial";
    const { result, rerender } = renderHook(() => useQueryState("q", ""));
    expect(result.current[0]).toBe("initial");

    // Simulate external URL change (e.g. Back/Forward navigation)
    mockSearchParamsString = "q=updated";
    rerender();

    expect(result.current[0]).toBe("updated");
  });

  it("resyncs to fallback value when searchParams param is removed externally", () => {
    mockSearchParamsString = "q=stellar";
    const { result, rerender } = renderHook(() => useQueryState("q", "default"));
    expect(result.current[0]).toBe("stellar");

    mockSearchParamsString = "";
    rerender();

    expect(result.current[0]).toBe("default");
  });
});
