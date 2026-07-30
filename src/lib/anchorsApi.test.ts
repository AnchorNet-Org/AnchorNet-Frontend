import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchAnchors,
  fetchAnchor,
  registerAnchor,
  deregisterAnchor,
} from "./anchorsApi";
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
 * Builds a `fetch` mock that emulates real fetch's cancellation behaviour: it
 * captures the `AbortSignal` handed to the outgoing request and, like the real
 * `fetch`, rejects with an `AbortError` `DOMException` when that signal aborts.
 *
 * `apiRequest` composes the caller's signal with an internal timeout controller
 * (see `composeSignals` in `api.ts`), so the object reaching `fetch` is a
 * *derived* signal rather than the caller's signal itself. Asserting that an
 * abort of the caller's signal propagates to the outgoing request is the
 * meaningful, implementation-agnostic way to verify signal forwarding — and it
 * is exactly the regression (a request no longer aborting on unmount/reload)
 * that this coverage is meant to catch.
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

describe("anchorsApi", () => {
  it("fetches the anchors array", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, {
        anchors: [{ id: "a", name: "A", registeredAt: "", active: true }],
      }),
    );

    const anchors = await fetchAnchors();
    expect(anchors).toHaveLength(1);
    expect(anchors[0].id).toBe("a");
  });

  it("fetches a single anchor by id", async () => {
    const fn = mockFetch(200, {
      id: "a",
      name: "A",
      registeredAt: "",
      active: true,
    });
    vi.stubGlobal("fetch", fn);

    const anchor = await fetchAnchor("a");
    expect(anchor.id).toBe("a");
    expect(fn.mock.calls[0][0]).toContain("/api/v1/anchors/a");
  });

  // `registerAnchor` and `deregisterAnchor` do not accept an AbortSignal, so
  // only `fetchAnchors` and `fetchAnchor` need signal-forwarding coverage here.
  describe("abort signal forwarding", () => {
    it("fetchAnchors forwards the abort signal to the outgoing fetch call", async () => {
      const fn = mockAbortableFetch();
      vi.stubGlobal("fetch", fn);
      const controller = new AbortController();

      const promise = fetchAnchors(controller.signal);

      // The request reached `fetch` with an AbortSignal attached.
      expect(fn).toHaveBeenCalledTimes(1);
      const fetchSignal = fn.mock.calls[0][1].signal as AbortSignal;
      expect(fetchSignal).toBeInstanceOf(AbortSignal);
      expect(fetchSignal.aborted).toBe(false);

      // Aborting the caller's signal propagates to the outgoing request and
      // cancels it with an AbortError.
      controller.abort();
      expect(fetchSignal.aborted).toBe(true);
      await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    });

    it("fetchAnchor forwards the abort signal to the outgoing fetch call", async () => {
      const fn = mockAbortableFetch();
      vi.stubGlobal("fetch", fn);
      const controller = new AbortController();

      const promise = fetchAnchor("a", controller.signal);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn.mock.calls[0][0]).toContain("/api/v1/anchors/a");
      const fetchSignal = fn.mock.calls[0][1].signal as AbortSignal;
      expect(fetchSignal).toBeInstanceOf(AbortSignal);
      expect(fetchSignal.aborted).toBe(false);

      controller.abort();
      expect(fetchSignal.aborted).toBe(true);
      await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    });
  });

  it("surfaces a not-found error for an unknown anchor id", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(404, { error: { code: "NOT_FOUND", message: "no anchor" } }),
    );

    await expect(fetchAnchor("missing")).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("registers an anchor", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(201, { id: "a", name: "A", registeredAt: "", active: true }),
    );

    const anchor = await registerAnchor({ id: "a" });
    expect(anchor.active).toBe(true);
  });

  it("surfaces a conflict error", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(409, { error: { code: "CONFLICT", message: "exists" } }),
    );

    await expect(registerAnchor({ id: "a" })).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("deregisters an anchor", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { id: "a", name: "A", registeredAt: "", active: false }),
    );

    const anchor = await deregisterAnchor("a");
    expect(anchor.active).toBe(false);
  });
});
