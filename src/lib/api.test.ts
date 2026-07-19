import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPools, requestQuote, apiRequest, ApiRequestError, isAbortError } from "./api";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Mock",
    json: async () => body,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("sets a JSON content-type when a body is present", async () => {
    const fn = mockFetch(200, {});
    vi.stubGlobal("fetch", fn);

    await apiRequest("/x", { method: "POST", body: JSON.stringify({ a: 1 }) });

    const init = fn.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("throws ApiRequestError carrying the error code", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(400, { error: { code: "BAD_REQUEST", message: "nope" } }),
    );

    await expect(apiRequest("/x")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      status: 400,
    });
  });
});

describe("fetchPools", () => {
  it("returns the pools array on success", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { pools: [{ asset: "USDC", total: 100, anchors: 1 }] }),
    );

    const pools = await fetchPools();
    expect(pools).toHaveLength(1);
    expect(pools[0].asset).toBe("USDC");
  });

  it("throws ApiRequestError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(500, { error: { code: "INTERNAL", message: "boom" } }),
    );

    await expect(fetchPools()).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("requestQuote", () => {
  it("returns the quote on success", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        asset: "USDC",
        amount: 1000,
        fee: 1,
        deliverable: 999,
        route: ["big"],
      }),
    );

    const quote = await requestQuote({ asset: "USDC", amount: 1000 });
    expect(quote.deliverable).toBe(999);
    expect(quote.route).toEqual(["big"]);
  });

  it("propagates the API error code", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(400, {
        error: { code: "INSUFFICIENT_LIQUIDITY", message: "nope" },
      }),
    );

    await expect(
      requestQuote({ asset: "USDC", amount: 999999 }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_LIQUIDITY" });
  });
});

describe("isAbortError", () => {
  it("returns true for a DOMException with name AbortError", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isAbortError(new Error("network failure"))).toBe(false);
  });

  it("returns false for an ApiRequestError", () => {
    expect(isAbortError(new ApiRequestError(500, "INTERNAL", "boom"))).toBe(
      false,
    );
  });

  it("returns false for non-Error values", () => {
    expect(isAbortError("string error")).toBe(false);
    expect(isAbortError(null)).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
  });
});

describe("apiRequest — abort behaviour", () => {
  it("re-throws the AbortError when fetch is aborted mid-flight", async () => {
    // Simulate fetch rejecting with a DOMException (AbortError) as browsers do.
    const abortError = new DOMException("signal is aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const controller = new AbortController();
    controller.abort();

    const err = await apiRequest("/x", {
      signal: controller.signal,
    }).catch((e: unknown) => e);

    // apiRequest should surface the raw AbortError so callers can detect it
    // with isAbortError() and suppress any user-facing error toast.
    expect(isAbortError(err)).toBe(true);
  });

  it("still throws ApiRequestError for genuine non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(503, { error: { code: "UNAVAILABLE", message: "down" } }),
    );

    await expect(apiRequest("/x")).rejects.toBeInstanceOf(ApiRequestError);
  });
});
