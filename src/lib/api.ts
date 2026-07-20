/**
 * Thin client for the AnchorNet API.
 *
 * The base URL is configurable via `NEXT_PUBLIC_API_URL` so the same build can
 * target local, staging, or production backends.
 */

import { Pool, Quote, QuoteRequest, ApiErrorBody } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Returns true when `err` is an AbortError — the rejection thrown by `fetch`
 * (and other Web APIs) when an `AbortSignal` fires.  Use this to distinguish
 * a deliberate cancellation from a genuine network/server failure so callers
 * never surface a user-facing error toast for a request the app itself
 * cancelled on purpose.
 */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Error thrown when the API responds with a non-2xx status. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function parseError(res: Response): Promise<ApiRequestError> {
  const requestId = res.headers?.get("x-request-id") ?? undefined;
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    const code = body.error?.code ?? "UNKNOWN";
    const message = body.error?.message ?? res.statusText;
    return new ApiRequestError(res.status, code, message, requestId);
  } catch {
    return new ApiRequestError(res.status, "UNKNOWN", res.statusText, requestId);
  }
}

/**
 * Performs a JSON request against the API and returns the parsed body.
 * Throws {@link ApiRequestError} on a non-2xx response.
 */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as object) };
  if (init?.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

/**
 * Performs a request against the API and returns the response as text (e.g. CSV).
 * Throws {@link ApiRequestError} on a non-2xx response.
 */
export async function apiTextRequest(
  path: string,
  init?: RequestInit,
): Promise<string> {
  const headers: Record<string, string> = { ...(init?.headers as object) };
  if (init?.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) throw await parseError(res);
  return await res.text();
}

/** Fetches the aggregated liquidity pools. */
export async function fetchPools(signal?: AbortSignal): Promise<Pool[]> {
  const body = await apiRequest<{ pools: Pool[] }>("/api/v1/liquidity", {
    signal,
  });
  return body.pools;
}

/** Requests a routing quote for an asset/amount pair. */
export async function requestQuote(input: QuoteRequest): Promise<Quote> {
  return apiRequest<Quote>("/api/v1/quote", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
