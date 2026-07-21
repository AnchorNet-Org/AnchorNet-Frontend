import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchPools,
  requestQuote,
  apiRequest,
  ApiRequestError,
  buildQueryParams,
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
