import { ApiRequestError, isAbortError } from "./api";

export interface ErrorContext {
  route?: string;
  requestId?: string;
}

export function reportError(error: unknown, context?: ErrorContext): void {
  // Cancellation is expected control flow, not an operational failure.
  if (isAbortError(error)) return;

  const route = context?.route;
  const apiError = error instanceof ApiRequestError ? error : undefined;
  const requestId = context?.requestId ?? apiError?.requestId;

  const parts = [`[ErrorReporter]`];
  if (route) parts.push(`route=${route}`);
  if (requestId) parts.push(`requestId=${requestId}`);
  if (apiError) {
    parts.push(`kind=${apiError.kind}`);
    if (apiError.status !== undefined) parts.push(`status=${apiError.status}`);
    parts.push(`code=${apiError.code}`);
    parts.push(`attempts=${apiError.attempts}`);
  }

  console.error(parts.join(" "), error);
}
