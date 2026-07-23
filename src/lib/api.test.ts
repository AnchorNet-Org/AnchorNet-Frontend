import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { fetchPools, requestQuote, apiRequest, apiTextRequest, ApiRequestError, isAbortError, retryDelayMs } from "./api";

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

    const promise = apiRequest("/x", { timeout: 1000 }).catch((e: unknown) => e);
    
    await vi.advanceTimersByTimeAsync(1000);

    const err = await promise;
    expect(err).toBeInstanceOf(ApiRequestError);
    expect((err as ApiRequestError).code).toBe("TIMEOUT");
    expect((err as ApiRequestError).status).toBe(408);
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
    const promise = apiRequest("/x", { signal: controller.signal, timeout: 2000 }).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(2000);

    const err = await promise;
    expect(err).toBeInstanceOf(ApiRequestError);
    expect((err as ApiRequestError).code).toBe("TIMEOUT");
    expect(isAbortError(err)).toBe(false);
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

  it("adds bounded jitter to retry delays", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.75);
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
    expect(err).toBe(networkErr);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry network failure for non-idempotent request (POST)", async () => {
    const networkErr = new TypeError("Failed to fetch");
    const fn = vi.fn().mockRejectedValue(networkErr);
    vi.stubGlobal("fetch", fn);

    await expect(
      apiRequest("/x", { method: "POST", body: JSON.stringify({}) }),
    ).rejects.toBe(networkErr);
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
    expect(err).toBe(networkErr);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

