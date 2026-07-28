/**
 * Pure state helpers for the app-wide toast notification stack.
 */

/** A single toast notification. */
export interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

/** Maximum number of toasts visible at once; older ones are dropped. */
export const MAX_TOASTS = 3;

/** Result of pushing a toast onto the stack. */
export interface PushToastResult {
  toasts: Toast[];
  /** How many toasts this push bumped off the stack to stay within {@link MAX_TOASTS}. */
  droppedCount: number;
}

/** Appends a toast to the stack, keeping only the most recent {@link MAX_TOASTS}. */
export function pushToast(toasts: Toast[], toast: Toast): PushToastResult {
  const next = [...toasts, toast];
  const droppedCount = Math.max(0, next.length - MAX_TOASTS);
  return { toasts: next.slice(-MAX_TOASTS), droppedCount };
}

/** Removes a toast by id, leaving the rest of the stack untouched. */
export function dismissToast(toasts: Toast[], id: number): Toast[] {
  return toasts.filter((toast) => toast.id !== id);
}
