import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchMetrics } from "./metricsApi";
import { ApiRequestError } from "./api";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Mock",
    json: async () => body,
  });
}

/**
 * Builds a `fetch` mock that emulates real fetch's cancellation behaviour.
 *
 * The mock captures the `AbortSignal` handed to the outgoing request and, like
 * the real `fetch`, rejects with an `AbortError` `DOMException` when that signal
 * is aborted. This lets a test inspect the exact signal that reached `fetch` and
 * prove that aborting the caller's signal actually cancels the request.
 *
 * Note: `apiRequest` composes the caller's signal with an internal timeout
 * controller (see `composeSignals` in `api.ts`), so the object reaching `fetch`
 * is a *derived* signal rather than the caller's signal itself. Asserting that
 * an abort of the caller's signal propagates to the outgoing request is the
 * meaningful, implementation-agnostic way to verify signal forwarding.
 */
function mockAbortableFetch() {
  return vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
    const signal = init?.signal;
    return new Promise<Response>((_resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("The operation was aborted.", "AbortError"));
        return;
      }
      signal?.addEventListener(
        "abort",
        () =>
          reject(new DOMException("The operation was aborted.", "AbortError")),
        { once: true },
      );
    });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("metricsApi", () => {
  it("fetches aggregate metrics", async () => {
    const fn = mockFetch(200, {
      anchors: 3,
      activeAnchors: 2,
      pools: 1,
      totalLiquidity: 1000,
      settlements: 5,
      pendingSettlements: 1,
    });
    vi.stubGlobal("fetch", fn);

    const metrics = await fetchMetrics();
    expect(metrics.anchors).toBe(3);
    expect(fn.mock.calls[0][0]).toContain("/api/v1/metrics");
  });

  it("passes the abort signal through", async () => {
    const fn = mockAbortableFetch();
    vi.stubGlobal("fetch", fn);
    const controller = new AbortController();

    const promise = fetchMetrics(controller.signal);

    // The request reached `fetch` with an AbortSignal attached.
    expect(fn).toHaveBeenCalledTimes(1);
    const fetchSignal = fn.mock.calls[0][1].signal as AbortSignal;
    expect(fetchSignal).toBeInstanceOf(AbortSignal);
    expect(fetchSignal.aborted).toBe(false);

    // Aborting the caller's signal propagates to the outgoing request's signal
    // and cancels the in-flight request with an AbortError.
    controller.abort();
    expect(fetchSignal.aborted).toBe(true);
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("propagates API error status, code, and message", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(503, {
        error: {
          code: "METRICS_UNAVAILABLE",
          message: "Metrics service is temporarily unavailable",
        },
      }),
    );

    const error = await fetchMetrics().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      name: "ApiRequestError",
      status: 503,
      code: "METRICS_UNAVAILABLE",
      message: "Metrics service is temporarily unavailable",
    });
  });
});
