import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchSettlements,
  fetchSettlement,
  openSettlement,
  executeSettlement,
  cancelSettlement,
} from "./settlementsApi";
import { ApiRequestError } from "./api";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Mock",
    json: async () => body,
  });
  return fn;
}

function settlement(status = "pending") {
  return {
    id: 1,
    anchor: "a",
    asset: "USDC",
    amount: 100,
    fee: 1,
    status,
    createdAt: "",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("settlementsApi", () => {
  it("fetches settlements and forwards the anchor filter", async () => {
    const fn = mockFetch(200, {
      settlements: [settlement()],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    vi.stubGlobal("fetch", fn);

    const result = await fetchSettlements({ anchor: "a" });
    expect(result.settlements).toHaveLength(1);
    expect(fn.mock.calls[0][0]).toContain("anchor=a");
  });

  it("forwards page and pageSize as query params", async () => {
    const fn = mockFetch(200, {
      settlements: [settlement()],
      pagination: { page: 2, pageSize: 5, total: 11, totalPages: 3 },
    });
    vi.stubGlobal("fetch", fn);

    await fetchSettlements({ page: 2, pageSize: 5 });
    const url = fn.mock.calls[0][0] as string;
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=5");
  });

  it("returns pagination metadata alongside the settlements", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        settlements: [settlement()],
        pagination: { page: 1, pageSize: 20, total: 42, totalPages: 3 },
      }),
    );

    const result = await fetchSettlements();
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 42,
      totalPages: 3,
    });
  });

  it("omits query params entirely when no options are given", async () => {
    const fn = mockFetch(200, {
      settlements: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });
    vi.stubGlobal("fetch", fn);

    await fetchSettlements();
    const url = fn.mock.calls[0][0] as string;
    expect(url.endsWith("/api/v1/settlements")).toBe(true);
  });

  describe("exportSettlementsCsv", () => {
    it("fetches settlements as CSV and passes query params including format", async () => {
      const mockText = vi.fn().mockResolvedValue("id,anchor\n1,a");
      const fn = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: mockText,
      });
      vi.stubGlobal("fetch", fn);

      const { exportSettlementsCsv } = await import("./settlementsApi");
      const result = await exportSettlementsCsv({ anchor: "b", page: 1, pageSize: 50 });
      
      expect(result).toBe("id,anchor\n1,a");
      const url = fn.mock.calls[0][0] as string;
      expect(url).toContain("anchor=b");
      expect(url).toContain("page=1");
      expect(url).toContain("pageSize=50");
      expect(url).toContain("format=csv");
    });
  });

  it("fetches a single settlement by id", async () => {
    const fn = mockFetch(200, settlement());
    vi.stubGlobal("fetch", fn);

    const result = await fetchSettlement(1);
    expect(result.id).toBe(1);
    expect(fn.mock.calls[0][0]).toContain("/api/v1/settlements/1");
  });

  it("surfaces a not-found error for an unknown settlement id", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(404, { error: { code: "NOT_FOUND", message: "no settlement" } }),
    );

    await expect(fetchSettlement(999)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("opens a settlement", async () => {
    vi.stubGlobal("fetch", mockFetch(201, settlement()));
    const result = await openSettlement({
      anchor: "a",
      asset: "USDC",
      amount: 100,
    });
    expect(result.status).toBe("pending");
  });

  it("executes a settlement", async () => {
    vi.stubGlobal("fetch", mockFetch(200, settlement("executed")));
    const result = await executeSettlement(1);
    expect(result.status).toBe("executed");
  });

  it("cancels a settlement", async () => {
    vi.stubGlobal("fetch", mockFetch(200, settlement("cancelled")));
    const result = await cancelSettlement(1);
    expect(result.status).toBe("cancelled");
  });
});
