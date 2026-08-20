import { describe, it, expect } from "vitest";
import {
  apiErrorMessage,
  pushToast,
  dismissToast,
  MAX_TOASTS,
  Toast,
} from "./toast";
import { ApiRequestError } from "./api";

function toast(id: number, message = "hello"): Toast {
  return { id, kind: "success", message };
}

describe("apiErrorMessage", () => {
  it("suppresses deliberate aborts", () => {
    expect(
      apiErrorMessage(new DOMException("aborted", "AbortError")),
    ).toBeNull();
  });

  it.each([
    ["timeout", "The request timed out. Try again."],
    [
      "network",
      "Unable to reach the server. Check your connection and try again.",
    ],
    ["not_found", "The requested resource was not found."],
    ["invalid_response", "The server returned an invalid response."],
  ] as const)("maps %s failures to distinct user copy", (kind, message) => {
    const error = new ApiRequestError(undefined, "TEST", "internal", undefined, {
      kind,
    });
    expect(apiErrorMessage(error)).toBe(message);
  });

  it("uses the API message for client failures", () => {
    const error = new ApiRequestError(422, "VALIDATION", "Amount is invalid");
    expect(apiErrorMessage(error)).toBe("Amount is invalid");
  });

  it("uses safe server copy and includes an available request reference", () => {
    const error = new ApiRequestError(
      503,
      "UNAVAILABLE",
      "database host internal detail",
      "req-123",
    );
    expect(apiErrorMessage(error)).toBe(
      "The service is temporarily unavailable. Try again. Reference: req-123.",
    );
  });

  it("uses safe server copy when no request reference is available", () => {
    const error = new ApiRequestError(503, "UNAVAILABLE", "internal detail");
    expect(apiErrorMessage(error)).toBe(
      "The service is temporarily unavailable. Try again.",
    );
  });

  it("preserves an Error message for an unclassified failure", () => {
    expect(apiErrorMessage(new Error("Network error"), "Export failed.")).toBe(
      "Network error",
    );
  });

  it("uses the supplied fallback for a non-Error failure", () => {
    expect(apiErrorMessage("failure", "Export failed.")).toBe("Export failed.");
  });
});

describe("pushToast", () => {
  it("appends a toast to an empty stack", () => {
    const result = pushToast([], toast(1));
    expect(result.toasts).toEqual([toast(1)]);
    expect(result.droppedCount).toBe(0);
  });

  it("keeps toasts in insertion order", () => {
    const result = pushToast([toast(1)], toast(2));
    expect(result.toasts.map((t) => t.id)).toEqual([1, 2]);
    expect(result.droppedCount).toBe(0);
  });

  it("reports zero dropped while under the cap", () => {
    const result = pushToast([toast(1), toast(2)], toast(3));
    expect(result.droppedCount).toBe(0);
  });

  it(`caps the stack at ${MAX_TOASTS} toasts, dropping the oldest`, () => {
    let toasts: Toast[] = [];
    let totalDropped = 0;
    for (let id = 1; id <= MAX_TOASTS + 2; id += 1) {
      const result = pushToast(toasts, toast(id));
      toasts = result.toasts;
      totalDropped += result.droppedCount;
    }
    expect(toasts).toHaveLength(MAX_TOASTS);
    expect(toasts.map((t) => t.id)).toEqual([3, 4, 5]);
    expect(totalDropped).toBe(2);
  });

  it("reports one dropped once the stack is already at the cap", () => {
    const toasts = [toast(1), toast(2), toast(3)];
    const result = pushToast(toasts, toast(4));
    expect(result.droppedCount).toBe(1);
    expect(result.toasts.map((t) => t.id)).toEqual([2, 3, 4]);
  });

  it("keeps only the most recent MAX_TOASTS after a burst of pushes, in original order", () => {
    // Simulate several near-simultaneous pushToast calls (e.g. a batch of
    // failed requests each firing notify at once).  We push MAX_TOASTS * 2 + 1
    // toasts in sequence and verify the surviving slice is exactly the last
    // MAX_TOASTS entries, in their original push order.
    const burstSize = MAX_TOASTS * 2 + 1; // e.g. 7 for MAX_TOASTS = 3
    let toasts: Toast[] = [];
    let totalDropped = 0;

    for (let id = 1; id <= burstSize; id += 1) {
      const result = pushToast(toasts, toast(id, `msg-${id}`));
      toasts = result.toasts;
      totalDropped += result.droppedCount;
    }

    // Only the last MAX_TOASTS survive.
    expect(toasts).toHaveLength(MAX_TOASTS);

    // They are the most recently pushed ones …
    const expectedIds = Array.from(
      { length: MAX_TOASTS },
      (_, i) => burstSize - MAX_TOASTS + 1 + i
    );
    expect(toasts.map((t) => t.id)).toEqual(expectedIds);

    // … and their messages are intact (no identity mix-up).
    expect(toasts.map((t) => t.message)).toEqual(
      expectedIds.map((id) => `msg-${id}`)
    );

    // The total number of dropped toasts equals everything that didn't survive.
    expect(totalDropped).toBe(burstSize - MAX_TOASTS);
  });
});

describe("dismissToast", () => {
  it("removes only the toast with the matching id", () => {
    const toasts = [toast(1), toast(2), toast(3)];
    const result = dismissToast(toasts, 2);
    expect(result.map((t) => t.id)).toEqual([1, 3]);
  });

  it("is a no-op when the id is not present", () => {
    const toasts = [toast(1), toast(2)];
    const result = dismissToast(toasts, 99);
    expect(result).toEqual(toasts);
  });

  it("does not mutate the input array", () => {
    const toasts = [toast(1), toast(2)];
    dismissToast(toasts, 1);
    expect(toasts).toHaveLength(2);
  });
});
