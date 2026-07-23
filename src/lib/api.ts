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

const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 500;

/**
 * Uses equal jitter so retries retain exponential growth while callers that
 * fail together do not retry in lockstep. Each delay is between one and two
 * times the exponential base delay.
 */
export function retryDelayMs(attempt: number): number {
  const baseDelay = INITIAL_BACKOFF_MS * 2 ** attempt;
  return baseDelay + Math.random() * baseDelay;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("signal is aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("signal is aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function isIdempotent(method?: string): boolean {
  return !method || method === "GET" || method === "HEAD";
}

function isRetryable(method: string | undefined, status: number): boolean {
  return isIdempotent(method) && status >= 500 && status < 600;
}

async function doFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

export interface ApiRequestInit extends RequestInit {
  timeout?: number;
}

export let globalDefaultTimeoutMs = 10000;

export function setDefaultTimeout(ms: number) {
  globalDefaultTimeoutMs = ms;
}

function composeSignals(
  timeoutMs: number,
  callerSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void; hasTimedOut: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onCallerAbort = () => {
    clearTimeout(timer);
    controller.abort();
  };

  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      callerSignal.addEventListener("abort", onCallerAbort, { once: true });
    }
  }

  const cleanup = () => {
    clearTimeout(timer);
    if (callerSignal) {
      callerSignal.removeEventListener("abort", onCallerAbort);
    }
  };

  const hasTimedOut = () => timedOut;

  return { signal: controller.signal, cleanup, hasTimedOut };
}

/**
 * Performs a JSON request against the API and returns the parsed body.
 * Throws {@link ApiRequestError} on a non-2xx response.
 * Retries up to {@link MAX_RETRIES} times on 5xx or network failures for idempotent requests.
 */
export async function apiRequest<T>(
  path: string,
  init?: ApiRequestInit,
): Promise<T> {
  let lastError: unknown;
  const method = init?.method;
  const timeoutMs = init?.timeout ?? globalDefaultTimeoutMs;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (init?.signal?.aborted) {
      throw new DOMException("signal is aborted", "AbortError");
    }

    const { signal: combinedSignal, cleanup, hasTimedOut } = composeSignals(timeoutMs, init?.signal);
    let res: Response;
    try {
      res = await doFetch(path, { ...init, signal: combinedSignal });
    } catch (err) {
      cleanup();
      if (hasTimedOut()) {
        throw new ApiRequestError(408, "TIMEOUT", "Request timed out");
      }
      if (isAbortError(err) || !isIdempotent(method) || attempt === MAX_RETRIES) {
        throw err;
      }
      lastError = err;
      await sleep(INITIAL_BACKOFF_MS * 2 ** attempt, init?.signal ?? undefined);
      continue;
    }
    cleanup();

    if (res.ok) return (await res.json()) as T;

    lastError = await parseError(res);

    if (!isRetryable(method, res.status) || attempt === MAX_RETRIES) {
      throw lastError;
    }

    await sleep(retryDelayMs(attempt), init?.signal ?? undefined);
  }

  throw lastError!;
}

/**
 * Performs a request against the API and returns the response as text (e.g. CSV).
 * Throws {@link ApiRequestError} on a non-2xx response.
 * Retries up to {@link MAX_RETRIES} times on 5xx or network failures for idempotent requests.
 */
export async function apiTextRequest(
  path: string,
  init?: ApiRequestInit,
): Promise<string> {
  let lastError: unknown;
  const method = init?.method;
  const timeoutMs = init?.timeout ?? globalDefaultTimeoutMs;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (init?.signal?.aborted) {
      throw new DOMException("signal is aborted", "AbortError");
    }

    const { signal: combinedSignal, cleanup, hasTimedOut } = composeSignals(timeoutMs, init?.signal);
    let res: Response;
    try {
      res = await doFetch(path, { ...init, signal: combinedSignal });
    } catch (err) {
      cleanup();
      if (hasTimedOut()) {
        throw new ApiRequestError(408, "TIMEOUT", "Request timed out");
      }
      if (isAbortError(err) || !isIdempotent(method) || attempt === MAX_RETRIES) {
        throw err;
      }
      lastError = err;
      await sleep(INITIAL_BACKOFF_MS * 2 ** attempt, init?.signal ?? undefined);
      continue;
    }
    cleanup();

    if (res.ok) return await res.text();

    lastError = await parseError(res);

    if (!isRetryable(method, res.status) || attempt === MAX_RETRIES) {
      throw lastError;
    }

    await sleep(retryDelayMs(attempt), init?.signal ?? undefined);
  }

  throw lastError!;
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
