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
    const fn = mockFetch(200, {
      anchors: 0,
      activeAnchors: 0,
      pools: 0,
      totalLiquidity: 0,
      settlements: 0,
      pendingSettlements: 0,
    });
    vi.stubGlobal("fetch", fn);
    const controller = new AbortController();

    await fetchMetrics(controller.signal);
    expect(fn.mock.calls[0][1].signal).toBe(controller.signal);
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
