import { describe, it, expect } from "vitest";
import { pushToast, dismissToast, MAX_TOASTS, Toast } from "./toast";

function toast(id: number, message = "hello"): Toast {
  return { id, kind: "success", message };
}

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
