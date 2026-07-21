import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { fetchPools, requestQuote, apiRequest, apiTextRequest, ApiRequestError, isAbortError } from "./api";

function mockFetch(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Mock",
    headers: {
      get(name: string) {
        return headers?.[name] ?? null;
      },
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

function mockFetchSequence(...responses: Array<{ status: number; body: unknown }>) {
  let call = 0;
  return vi.fn().mockImplementation(() => {
    const { status, body } = responses[Math.min(call++, responses.length - 1)];
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: "Mock",
      headers: { get: () => null },
      json: async () => body,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    });
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
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

  it("attaches the x-request-id header when present on the response", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(400, { error: { code: "ERR", message: "bad" } }, { "x-request-id": "req-abc" }),
    );

    await expect(apiRequest("/x")).rejects.toMatchObject({
      requestId: "req-abc",
    });
  });

  it("omits requestId when the response lacks the x-request-id header", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(400, { error: { code: "ERR", message: "bad" } }),
    );

    const err = await apiRequest("/x").catch((e) => e);
    expect(err.requestId).toBeUndefined();
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
      mockFetch(400, { error: { code: "INTERNAL", message: "boom" } }),
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
    const abortError = new DOMException("signal is aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const controller = new AbortController();
    controller.abort();

    const err = await apiRequest("/x", {
      signal: controller.signal,
    }).catch((e: unknown) => e);

    expect(isAbortError(err)).toBe(true);
  });

  it("still throws ApiRequestError for genuine non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(404, { error: { code: "NOT_FOUND", message: "nope" } }),
    );

    await expect(apiRequest("/x")).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("apiRequest — retry on 5xx", () => {
  it("retries a 503 and succeeds on second attempt", async () => {
    const fn = mockFetchSequence(
      { status: 503, body: { error: { code: "UNAVAILABLE", message: "down" } } },
      { status: 200, body: { ok: true } },
    );
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest<{ ok: boolean }>("/x");
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and throws after 3 attempts", async () => {
    const fn = mockFetchSequence(
      { status: 503, body: { error: { code: "DOWN", message: "a" } } },
      { status: 503, body: { error: { code: "DOWN", message: "b" } } },
      { status: 503, body: { error: { code: "DOWN", message: "c" } } },
    );
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest("/x").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(Promise.resolve(promise)).resolves.toMatchObject({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 400", async () => {
    const fn = mockFetchSequence(
      { status: 400, body: { error: { code: "BAD_REQUEST", message: "nope" } } },
    );
    vi.stubGlobal("fetch", fn);

    await expect(apiRequest("/x")).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a POST even on 5xx", async () => {
    const fn = mockFetchSequence(
      { status: 500, body: { error: { code: "INTERNAL", message: "boom" } } },
    );
    vi.stubGlobal("fetch", fn);

    await expect(
      apiRequest("/x", { method: "POST", body: JSON.stringify({}) }),
    ).rejects.toMatchObject({ status: 500 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry when signal is aborted during backoff", async () => {
    const fn = mockFetchSequence(
      { status: 503, body: { error: { code: "DOWN", message: "a" } } },
      { status: 200, body: { ok: true } },
    );
    vi.stubGlobal("fetch", fn);

    const controller = new AbortController();
    const promise = apiRequest("/x", { signal: controller.signal });

    await vi.advanceTimersByTimeAsync(100);
    controller.abort();

    await expect(promise).rejects.toSatisfy((e: unknown) => isAbortError(e));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("apiTextRequest — retry on 5xx", () => {
  it("retries a 503 and succeeds", async () => {
    const fn = mockFetchSequence(
      { status: 503, body: { error: { code: "DOWN", message: "a" } } },
      { status: 200, body: "csv-data" },
    );
    vi.stubGlobal("fetch", fn);

    const promise = apiTextRequest("/export");
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result).toBe("csv-data");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
