/**
 * Pure state helpers for the app-wide toast notification stack.
 */

import { ApiRequestError, classifyApiError } from "./api";

/** A single toast notification. */
export interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

/** Maximum number of toasts visible at once; older ones are dropped. */
export const MAX_TOASTS = 3;

/**
 * Converts a classified API failure into safe user-facing copy.
 * Deliberate cancellation returns `null` so callers cannot surface it as an
 * error toast during unmount or request replacement.
 */
export function apiErrorMessage(
  error: unknown,
  fallback = "Request failed.",
): string | null {
  switch (classifyApiError(error)) {
    case "aborted":
      return null;
    case "timeout":
      return "The request timed out. Try again.";
    case "network":
      return "Unable to reach the server. Check your connection and try again.";
    case "not_found":
      return "The requested resource was not found.";
    case "invalid_response":
      return "The server returned an invalid response.";
    case "server": {
      const reference =
        error instanceof ApiRequestError && error.requestId
          ? ` Reference: ${error.requestId}.`
          : "";
      return `The service is temporarily unavailable. Try again.${reference}`;
    }
    case "client":
      return error instanceof Error && error.message ? error.message : fallback;
    case "unknown":
      return error instanceof Error && error.message ? error.message : fallback;
  }
}

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
