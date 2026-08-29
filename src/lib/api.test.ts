import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  fetchPools,
  requestQuote,
  apiRequest,
  apiTextRequest,
  ApiRequestError,
  isAbortError,
  retryDelayMs,
  requestElapsedCeilingMs,
  MAX_ATTEMPTS,
  MAX_TIMEOUT_MS,
  globalDefaultTimeoutMs,
  setDefaultTimeout,
  buildQueryParams,
  API_BASE_URL,
} from "./api";

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
  vi.spyOn(Math, "random").mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("uses a network kind by default when no HTTP status is available", () => {
    expect(new ApiRequestError(undefined, "UNKNOWN", "failure")).toMatchObject({
      kind: "network",
      retryable: false,
    });
  });

  it("sets a JSON content-type when a body is present", async () => {
    const fn = mockFetch(200, {});
    vi.stubGlobal("fetch", fn);

    await apiRequest("/x", { method: "POST", body: JSON.stringify({ a: 1 }) });

    const init = fn.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it.each([
    ["plain object", { "X-Custom-Header": "preserved" }],
    ["Headers instance", new Headers({ "X-Custom-Header": "preserved" })],
    ["tuple array", [["X-Custom-Header", "preserved"]] as [string, string][]],
  ] satisfies Array<[string, HeadersInit]>)(
    "forwards headers passed as a %s",
    async (_label, headers) => {
      const fn = mockFetch(200, {});
      vi.stubGlobal("fetch", fn);

      await apiRequest("/x", { headers });

      const init = fn.mock.calls[0][1] as RequestInit;
      expect(new Headers(init.headers).get("X-Custom-Header")).toBe("preserved");
    },
  );

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

    const err = (await apiRequest("/x").catch((e) => e)) as { requestId?: string };
    expect(err.requestId).toBeUndefined();
  });

  it("uses status fallbacks for an incomplete API error envelope", async () => {
    vi.stubGlobal("fetch", mockFetch(400, {}));

    await expect(apiRequest("/x")).rejects.toMatchObject({
      code: "UNKNOWN",
      message: "Mock",
    });
  });

  it("uses status fallbacks when an error response body is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        headers: { get: () => null },
        json: async () => {
          throw new SyntaxError("invalid JSON");
        },
      }),
    );

    await expect(apiRequest("/x")).rejects.toMatchObject({
      code: "UNKNOWN",
      message: "Bad Request",
    });
  });

  it("honours a configured default timeout", async () => {
    const originalTimeout = globalDefaultTimeoutMs;
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("signal is aborted", "AbortError"));
        });
      }),
    );
    vi.stubGlobal("fetch", fn);

    try {
      setDefaultTimeout(25);
      const promise = apiRequest("/x", { retry: "never" }).catch(
        (error: unknown) => error,
      );
      await vi.advanceTimersByTimeAsync(25);

      await expect(promise).resolves.toMatchObject({ kind: "timeout" });
    } finally {
      setDefaultTimeout(originalTimeout);
    }
  });

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_TIMEOUT_MS + 1])(
    "rejects an invalid per-request timeout %s before fetch",
    async (timeout) => {
      const fn = vi.fn();
      vi.stubGlobal("fetch", fn);

      await expect(apiRequest("/x", { timeout })).rejects.toThrow(RangeError);
      expect(fn).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid default timeouts without replacing the current value", () => {
    const originalTimeout = globalDefaultTimeoutMs;

    expect(() => setDefaultTimeout(Number.NaN)).toThrow(RangeError);
    expect(globalDefaultTimeoutMs).toBe(originalTimeout);
  });

  it("rejects an invalid timeout when calculating the elapsed ceiling", () => {
    expect(() => requestElapsedCeilingMs(MAX_TIMEOUT_MS + 1)).toThrow(
      RangeError,
    );
  });

  it("throws a descriptive ApiRequestError when a successful JSON response is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        json: async () => {
          throw new SyntaxError("Unexpected end of JSON input");
        },
        text: async () => "",
      }),
    );

    const err = await apiRequest("/x").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).not.toBeInstanceOf(SyntaxError);
    expect(err).toMatchObject({
      name: "ApiRequestError",
      status: 200,
      code: "INVALID_RESPONSE",
      kind: "invalid_response",
      retryable: false,
      attempts: 1,
      message: "The server returned an invalid response.",
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

  it("retries quote calculation because the operation is explicitly idempotent", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        json: async () => ({
          asset: "USDC",
          amount: 1000,
          fee: 1,
          deliverable: 999,
          route: ["big"],
        }),
      });
    vi.stubGlobal("fetch", fn);

    const promise = requestQuote({ asset: "USDC", amount: 1000 });
    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toMatchObject({ deliverable: 999 });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("buildQueryParams", () => {
  it("returns an empty string for an empty params object", () => {
    expect(buildQueryParams({})).toBe("");
  });

  it("returns an empty string when all values are undefined", () => {
    expect(buildQueryParams({ a: undefined, b: undefined })).toBe("");
  });

  it("builds a single query parameter", () => {
    expect(buildQueryParams({ anchor: "a" })).toBe("?anchor=a");
  });

  it("builds multiple query parameters", () => {
    expect(buildQueryParams({ anchor: "a", page: 1, pageSize: 20 })).toBe(
      "?anchor=a&page=1&pageSize=20",
    );
  });

  it("skips undefined values while including defined ones", () => {
    expect(
      buildQueryParams({ anchor: "a", page: undefined, pageSize: 20 }),
    ).toBe("?anchor=a&pageSize=20");
  });

  it("converts number values to strings", () => {
    const result = buildQueryParams({ page: 5 });
    expect(result).toBe("?page=5");
  });

  it("handles string values that need encoding", () => {
    expect(buildQueryParams({ name: "hello world" })).toBe("?name=hello+world");
  });

  it("preserves order of insertion", () => {
    const result = buildQueryParams({ a: "1", b: "2", c: "3" });
    expect(result).toBe("?a=1&b=2&c=3");
  });

  it("works with the same shape as FetchSettlementsOptions", () => {
    const options: Record<string, string | number | undefined> = {
      anchor: "test-anchor",
      page: 2,
      pageSize: 10,
    };
    expect(buildQueryParams(options)).toBe(
      "?anchor=test-anchor&page=2&pageSize=10",
    );
  });

  it("matches the behaviour of the original inline URLSearchParams logic", () => {
    // This test replicates the pattern from the original fetchSettlements
    // to confirm the extracted helper produces identical output.
    const { anchor, page, pageSize } = { anchor: "a", page: 1, pageSize: 20 };
    const query = buildQueryParams({ anchor, page, pageSize });
    expect(query).toBe("?anchor=a&page=1&pageSize=20");
  });

  it("matches empty-options behaviour of the original logic", () => {
    const { anchor, page, pageSize } = {
      anchor: undefined,
      page: undefined,
      pageSize: undefined,
    } as Record<string, undefined>;
    const query = buildQueryParams({ anchor, page, pageSize });
    expect(query).toBe("");
  });
});

describe("isAbortError", () => {
  it("returns true for a DOMException with name AbortError", () => {
    expect(isAbortError(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isAbortError(new Error("network failure"))).toBe(false);
  });

  it("recognises an AbortError represented by a plain Error", () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    expect(isAbortError(error)).toBe(true);
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

  it("aborts the request with a TIMEOUT error when internal timeout is reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, init) => {
      return new Promise((resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("The user aborted a request.", "AbortError"));
        } else {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The user aborted a request.", "AbortError"));
          });
        }
      });
    }));

    const promise = apiRequest("/x", { timeout: 1000, retry: "never" }).catch(
      (e: unknown) => e,
    );
    
    await vi.advanceTimersByTimeAsync(1000);

    const err = await promise;
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({
      status: undefined,
      code: "TIMEOUT",
      kind: "timeout",
      retryable: false,
      attempts: 1,
    });
  });

  it("allows the caller's AbortSignal to cancel the request before the timeout is reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, init) => {
      return new Promise((resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("The user aborted a request.", "AbortError"));
        } else {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The user aborted a request.", "AbortError"));
          });
        }
      });
    }));

    const controller = new AbortController();
    const promise = apiRequest("/x", { signal: controller.signal, timeout: 5000 }).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();

    const err = await promise;
    expect(isAbortError(err)).toBe(true);
  });

  it("aborts the request with a TIMEOUT error even if a caller's AbortSignal is also provided but hasn't fired yet", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, init) => {
      return new Promise((resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("The user aborted a request.", "AbortError"));
        } else {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The user aborted a request.", "AbortError"));
          });
        }
      });
    }));

    const controller = new AbortController();
    const promise = apiRequest("/x", {
      signal: controller.signal,
      timeout: 2000,
      retry: "never",
    }).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(2000);

    const err = await promise;
    expect(err).toBeInstanceOf(ApiRequestError);
    expect((err as ApiRequestError).code).toBe("TIMEOUT");
    expect(isAbortError(err)).toBe(false);
  });

  it("gives a caller abort precedence when it is queued before the same-deadline timeout", async () => {
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("signal is aborted", "AbortError"));
        });
      }),
    );
    vi.stubGlobal("fetch", fn);
    const controller = new AbortController();

    setTimeout(() => controller.abort(), 1000);
    const promise = apiRequest("/x", {
      signal: controller.signal,
      timeout: 1000,
      retry: "never",
    }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toSatisfy((error: unknown) =>
      isAbortError(error),
    );
  });

  it("classifies the timeout when it is queued before a same-deadline caller abort", async () => {
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("signal is aborted", "AbortError"));
        });
      }),
    );
    vi.stubGlobal("fetch", fn);
    const controller = new AbortController();

    const promise = apiRequest("/x", {
      signal: controller.signal,
      timeout: 1000,
      retry: "never",
    }).catch((error: unknown) => error);
    setTimeout(() => controller.abort(), 1000);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toMatchObject({
      kind: "timeout",
      attempts: 1,
    });
  });

  it("classifies a body-consumption TypeError as an invalid response", async () => {
    const bodyError = new TypeError("Body is disturbed");
    const fn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: { get: () => "req-body" },
      json: async () => {
        throw bodyError;
      },
    });
    vi.stubGlobal("fetch", fn);

    await expect(apiRequest("/x")).rejects.toMatchObject({
      kind: "invalid_response",
      code: "INVALID_RESPONSE",
      requestId: "req-body",
      retryable: false,
      attempts: 1,
      cause: bodyError,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("keeps caller abort propagation active while the response body is being read", async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        json: () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(new DOMException("signal is aborted", "AbortError"));
            });
          }),
      }),
    );
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest("/x", { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    await expect(promise).rejects.toSatisfy((error: unknown) => isAbortError(error));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("preserves caller abort while reading an HTTP error body", async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) =>
      Promise.resolve({
        ok: false,
        status: 503,
        statusText: "Unavailable",
        headers: { get: () => null },
        json: () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(new DOMException("signal is aborted", "AbortError"));
            });
          }),
      }),
    );
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest("/x", { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    await expect(promise).rejects.toSatisfy((error: unknown) => isAbortError(error));
    expect(fn).toHaveBeenCalledTimes(1);
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
    await vi.advanceTimersByTimeAsync(1000);
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
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

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

  it.each([408, 500, 502, 503, 504])(
    "retries transient HTTP %i for an idempotent request",
    async (status) => {
      const fn = mockFetchSequence(
        { status, body: { error: { code: "TRANSIENT", message: "retry" } } },
        { status: 200, body: { ok: true } },
      );
      vi.stubGlobal("fetch", fn);

      const promise = apiRequest<{ ok: boolean }>("/x");
      await vi.advanceTimersByTimeAsync(500);

      await expect(promise).resolves.toEqual({ ok: true });
      expect(fn).toHaveBeenCalledTimes(2);
    },
  );

  it.each([400, 401, 403, 404, 409, 413, 422, 429, 501, 505])(
    "does not retry permanent HTTP %i",
    async (status) => {
      const fn = mockFetchSequence({
        status,
        body: { error: { code: "PERMANENT", message: "do not retry" } },
      });
      vi.stubGlobal("fetch", fn);

      const error = await apiRequest("/x").catch((caught: unknown) => caught);

      expect(error).toMatchObject({ status, retryable: false, attempts: 1 });
      expect(fn).toHaveBeenCalledTimes(1);
    },
  );

  it("does not retry any unlisted 4xx or 5xx status", async () => {
    const retryable = new Set([408, 500, 502, 503, 504]);
    const permanentStatuses = Array.from(
      { length: 200 },
      (_, index) => index + 400,
    ).filter((status) => !retryable.has(status));

    for (const status of permanentStatuses) {
      const fn = mockFetchSequence({
        status,
        body: { error: { code: "PERMANENT", message: "do not retry" } },
      });
      vi.stubGlobal("fetch", fn);

      const error = await apiRequest("/x").catch((caught: unknown) => caught);

      expect(error).toMatchObject({ status, retryable: false, attempts: 1 });
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it("classifies 404 separately from other client failures", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(404, { error: { code: "NOT_FOUND", message: "missing" } }),
    );

    await expect(apiRequest("/x")).rejects.toMatchObject({
      kind: "not_found",
      retryable: false,
    });
  });

  it("does not retry a POST even on 5xx", async () => {
    const fn = mockFetchSequence(
      { status: 500, body: { error: { code: "INTERNAL", message: "boom" } } },
    );
    vi.stubGlobal("fetch", fn);

    await expect(
      apiRequest("/x", { method: "POST", body: JSON.stringify({}) }),
    ).rejects.toMatchObject({ status: 500, retryable: false });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry DELETE without an explicit idempotency contract", async () => {
    const fn = mockFetchSequence({
      status: 503,
      body: { error: { code: "DOWN", message: "unavailable" } },
    });
    vi.stubGlobal("fetch", fn);

    await expect(apiRequest("/x", { method: "DELETE" })).rejects.toMatchObject({
      status: 503,
      retryable: false,
      attempts: 1,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("normalizes method casing when applying the default retry policy", async () => {
    const fn = mockFetchSequence(
      { status: 503, body: { error: { code: "DOWN", message: "retry" } } },
      { status: 200, body: { ok: true } },
    );
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest("/x", { method: "get" });
    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
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

  it("does not enter backoff when the caller aborts while parsing the failure", async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Unavailable",
      headers: { get: () => null },
      json: async () => {
        controller.abort();
        return { error: { code: "DOWN", message: "retry" } };
      },
    });
    vi.stubGlobal("fetch", fn);

    await expect(
      apiRequest("/x", { signal: controller.signal }),
    ).rejects.toSatisfy((error: unknown) => isAbortError(error));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("adds bounded jitter to retry delays", async () => {
    const randomSpy = vi
      .mocked(Math.random)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.75);
    const delays = [retryDelayMs(0), retryDelayMs(0)];

    expect(delays).toEqual([500, 875]);
    expect(delays.every((delay) => typeof delay === "number" && delay >= 500 && delay <= 1000)).toBe(true);
    expect(randomSpy).toHaveBeenCalledTimes(2);
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
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe("csv-data");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a permanent 501 response", async () => {
    const fn = mockFetchSequence({
      status: 501,
      body: { error: { code: "NOT_IMPLEMENTED", message: "unsupported" } },
    });
    vi.stubGlobal("fetch", fn);

    await expect(apiTextRequest("/export")).rejects.toMatchObject({
      status: 501,
      retryable: false,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("keeps timeout protection active while reading text", async () => {
    let call = 0;
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) => {
      call += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        text:
          call === 1
            ? () =>
                new Promise((_resolve, reject) => {
                  init.signal?.addEventListener("abort", () => {
                    reject(new DOMException("signal is aborted", "AbortError"));
                  });
                })
            : async () => "csv-data",
      });
    });
    vi.stubGlobal("fetch", fn);

    const promise = apiTextRequest("/export", { timeout: 1000 });
    await vi.advanceTimersByTimeAsync(1500);

    await expect(promise).resolves.toBe("csv-data");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("classifies an unreadable text body as an invalid response", async () => {
    const bodyError = new TypeError("Body is locked");
    const fn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: { get: () => "req-text" },
      text: async () => {
        throw bodyError;
      },
    });
    vi.stubGlobal("fetch", fn);

    await expect(apiTextRequest("/export")).rejects.toMatchObject({
      kind: "invalid_response",
      code: "INVALID_RESPONSE",
      requestId: "req-text",
      retryable: false,
      attempts: 1,
      cause: bodyError,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("apiRequest — retry on network failure", () => {
  it("retries a network failure and succeeds on second attempt", async () => {
    let call = 0;
    const fn = vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        json: async () => ({ ok: true }),
      });
    });
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest<{ ok: boolean }>("/x");
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and throws network error after 3 attempts", async () => {
    const networkErr = new TypeError("Failed to fetch");
    const fn = vi.fn().mockRejectedValue(networkErr);
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest("/x").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);

    const err = await promise;
    expect(err).toMatchObject({
      kind: "network",
      code: "NETWORK_ERROR",
      attempts: MAX_ATTEMPTS,
      cause: networkErr,
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry network failure for non-idempotent request (POST)", async () => {
    const networkErr = new TypeError("Failed to fetch");
    const fn = vi.fn().mockRejectedValue(networkErr);
    vi.stubGlobal("fetch", fn);

    await expect(
      apiRequest("/x", { method: "POST", body: JSON.stringify({}) }),
    ).rejects.toMatchObject({
      kind: "network",
      retryable: false,
      attempts: 1,
      cause: networkErr,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry when fetch rejects with AbortError", async () => {
    const abortErr = new DOMException("signal is aborted", "AbortError");
    const fn = vi.fn().mockRejectedValue(abortErr);
    vi.stubGlobal("fetch", fn);

    await expect(apiRequest("/x")).rejects.toBe(abortErr);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("apiTextRequest — retry on network failure", () => {
  it("retries a network failure and succeeds", async () => {
    let call = 0;
    const fn = vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) {
        return Promise.reject(new TypeError("Failed to fetch"));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        json: async () => "csv-data",
        text: async () => "csv-data",
      });
    });
    vi.stubGlobal("fetch", fn);

    const promise = apiTextRequest("/export");
    await vi.advanceTimersByTimeAsync(500);
    const result = await promise;

    expect(result).toBe("csv-data");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and throws network error after 3 attempts", async () => {
    const networkErr = new TypeError("Failed to fetch");
    const fn = vi.fn().mockRejectedValue(networkErr);
    vi.stubGlobal("fetch", fn);

    const promise = apiTextRequest("/export").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);

    const err = await promise;
    expect(err).toMatchObject({
      kind: "network",
      attempts: MAX_ATTEMPTS,
      cause: networkErr,
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("request timeout budget", () => {
  function hangingFetch() {
    return vi.fn().mockImplementation((_url, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("signal is aborted", "AbortError"));
        });
      }),
    );
  }

  it("retries timeout failures for idempotent requests and remains bounded", async () => {
    // `1` exercises the conservative inclusive ceiling; Math.random itself is < 1.
    vi.mocked(Math.random).mockReturnValue(1);
    const fn = hangingFetch();
    vi.stubGlobal("fetch", fn);
    let settled = false;

    const promise = apiRequest("/x", { timeout: 1000 })
      .catch((error: unknown) => error)
      .finally(() => {
        settled = true;
      });

    expect(requestElapsedCeilingMs(1000)).toBe(6000);
    expect(requestElapsedCeilingMs(10000)).toBe(33000);

    await vi.advanceTimersByTimeAsync(5999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const error = await promise;
    expect(error).toMatchObject({
      kind: "timeout",
      attempts: MAX_ATTEMPTS,
    });
    expect(fn).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it("keeps the timeout active while reading the response body", async () => {
    let call = 0;
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) => {
      call += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        json:
          call === 1
            ? () =>
                new Promise((_resolve, reject) => {
                  init.signal?.addEventListener("abort", () => {
                    reject(new DOMException("signal is aborted", "AbortError"));
                  });
                })
            : async () => ({ ok: true }),
      });
    });
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest<{ ok: boolean }>("/x", { timeout: 1000 });
    await vi.advanceTimersByTimeAsync(1500);

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("keeps the timeout active while reading a retryable HTTP error body", async () => {
    let call = 0;
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) => {
      call += 1;
      return Promise.resolve({
        ok: call > 1,
        status: call > 1 ? 200 : 503,
        statusText: call > 1 ? "OK" : "Unavailable",
        headers: { get: () => null },
        json:
          call === 1
            ? () =>
                new Promise((_resolve, reject) => {
                  init.signal?.addEventListener("abort", () => {
                    reject(new DOMException("signal is aborted", "AbortError"));
                  });
                })
            : async () => ({ ok: true }),
      });
    });
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest<{ ok: boolean }>("/x", { timeout: 1000 });
    await vi.advanceTimersByTimeAsync(1500);

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-idempotent request that times out while reading", async () => {
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        json: () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(new DOMException("signal is aborted", "AbortError"));
            });
          }),
      }),
    );
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest("/mutation", {
      method: "POST",
      body: JSON.stringify({ value: 1 }),
      timeout: 1000,
    }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toMatchObject({
      kind: "timeout",
      retryable: false,
      attempts: 1,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("adversarial retry metadata and parser parity", () => {
  it("retries a transient response even when its error envelope is malformed", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Unavailable",
        headers: { get: () => "req-first" },
        json: async () => {
          throw new SyntaxError("invalid JSON");
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest<{ ok: boolean }>("/x");
    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("exposes only the final response request ID and total attempts", async () => {
    const fn = vi.fn().mockImplementation(() => {
      const attempt = fn.mock.calls.length;
      return Promise.resolve({
        ok: false,
        status: 503,
        statusText: "Unavailable",
        headers: { get: () => `req-${attempt}` },
        json: async () => ({
          error: { code: "DOWN", message: `failure ${attempt}` },
        }),
      });
    });
    vi.stubGlobal("fetch", fn);

    const promise = apiRequest("/x").catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1500);

    await expect(promise).resolves.toMatchObject({
      kind: "server",
      attempts: MAX_ATTEMPTS,
      requestId: "req-3",
      message: "failure 3",
    });
    expect(fn).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it("keeps caller abort propagation active while reading text", async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockImplementation((_url, init: RequestInit) =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => null },
        text: () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(new DOMException("signal is aborted", "AbortError"));
            });
          }),
      }),
    );
    vi.stubGlobal("fetch", fn);

    const promise = apiTextRequest("/export", { signal: controller.signal });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();

    await expect(promise).rejects.toSatisfy((error: unknown) =>
      isAbortError(error),
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a non-idempotent text request", async () => {
    const fn = mockFetchSequence({
      status: 503,
      body: { error: { code: "DOWN", message: "unavailable" } },
    });
    vi.stubGlobal("fetch", fn);

    await expect(
      apiTextRequest("/mutation", { method: "POST" }),
    ).rejects.toMatchObject({
      kind: "server",
      retryable: false,
      attempts: 1,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a permanent quote validation failure", async () => {
    const fn = mockFetchSequence({
      status: 422,
      body: { error: { code: "VALIDATION", message: "invalid quote" } },
    });
    vi.stubGlobal("fetch", fn);

    await expect(
      requestQuote({ asset: "USDC", amount: 0 }),
    ).rejects.toMatchObject({
      kind: "client",
      status: 422,
      retryable: false,
      attempts: 1,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("API_BASE_URL fallback", () => {
  it("falls back to http://localhost:3001 when NEXT_PUBLIC_API_URL is unset", () => {
    expect(API_BASE_URL).toBe("http://localhost:3001");
  });

  it("produces a valid URL that can be parsed", () => {
    expect(() => new URL(API_BASE_URL)).not.toThrow();
  });

  it("defaults to a localhost origin", () => {
    const url = new URL(API_BASE_URL);
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe("3001");
  });
});

