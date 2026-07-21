/**
 * Thin client for the AnchorNet API.
 *
 * The base URL is configurable via `NEXT_PUBLIC_API_URL` so the same build can
 * target local, staging, or production backends.
 */

import { Pool, Quote, QuoteRequest, ApiErrorBody } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ── Shared query-string builder ─────────────────────────────────────────────

/**
 * Build a URL query string from an object of parameters, skipping keys whose
 * values are `undefined`.
 *
 * Returns an empty string when no parameters are provided, or a string
 * starting with `?` otherwise.
 *
 * @example
 * buildQueryParams({ anchor: "a", page: 1, pageSize: undefined })
 * // => "?anchor=a&page=1"
 *
 * buildQueryParams({})
 * // => ""
 */
export function buildQueryParams(
  params: Record<string, string | number | undefined>,
): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined,
  );

  if (entries.length === 0) return "";

  const usp = new URLSearchParams();
  for (const [key, value] of entries) {
    usp.set(key, String(value));
  }
  return `?${usp.toString()}`;
}

/** Error thrown when the API responds with a non-2xx status. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function parseError(res: Response): Promise<ApiRequestError> {
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    const code = body.error?.code ?? "UNKNOWN";
    const message = body.error?.message ?? res.statusText;
    return new ApiRequestError(res.status, code, message);
  } catch {
    return new ApiRequestError(res.status, "UNKNOWN", res.statusText);
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
