/**
 * Thin client for the AnchorNet API.
 *
 * The base URL is configurable via `NEXT_PUBLIC_API_URL` so the same build can
 * target local, staging, or production backends.
 */

import { Pool, Quote, QuoteRequest, ApiErrorBody } from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let warnedMissingApiUrl = false;
if (!process.env.NEXT_PUBLIC_API_URL && !warnedMissingApiUrl) {
  warnedMissingApiUrl = true;
  console.warn(
    "NEXT_PUBLIC_API_URL is not set. Defaulting to http://localhost:3001. " +
      "Copy .env.example to .env.local and set NEXT_PUBLIC_API_URL for your environment.",
  );
}

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

/** Stable failure categories that UI consumers can branch on. */
export type ApiErrorKind =
  | "aborted"
  | "timeout"
  | "network"
  | "not_found"
  | "invalid_response"
  | "client"
  | "server"
  | "unknown";

interface ApiRequestErrorOptions {
  kind?: ApiErrorKind;
  retryable?: boolean;
  attempts?: number;
  cause?: unknown;
}

const RETRYABLE_HTTP_STATUSES = new Set([408, 500, 502, 503, 504]);

function errorKindForStatus(status: number): ApiErrorKind {
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "client";
}

/** Error thrown when the API response or transport cannot be used by the client. */
export class ApiRequestError extends Error {
  readonly status?: number;
  readonly code: string;
  readonly requestId?: string;
  readonly kind: ApiErrorKind;
  readonly retryable: boolean;
  readonly attempts: number;
  override readonly cause?: unknown;

  constructor(
    status: number | undefined,
    code: string,
    message: string,
    requestId?: string,
    options: ApiRequestErrorOptions = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.kind =
      options.kind ??
      (status === undefined ? "network" : errorKindForStatus(status));
    this.retryable =
      options.retryable ??
      (status !== undefined && RETRYABLE_HTTP_STATUSES.has(status));
    this.attempts = options.attempts ?? 1;
    this.cause = options.cause;
  }
}

async function parseError(
  res: Response,
  attempts: number,
  retryAllowed: boolean,
): Promise<ApiRequestError> {
  const requestId = res.headers?.get("x-request-id") ?? undefined;
  try {
    const body = (await res.json()) as Partial<ApiErrorBody>;
    const code = body.error?.code ?? "UNKNOWN";
    const message = body.error?.message ?? res.statusText;
    return new ApiRequestError(res.status, code, message, requestId, {
      attempts,
      retryable: retryAllowed && RETRYABLE_HTTP_STATUSES.has(res.status),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return new ApiRequestError(res.status, "UNKNOWN", res.statusText, requestId, {
      attempts,
      retryable: retryAllowed && RETRYABLE_HTTP_STATUSES.has(res.status),
    });
  }
}

async function parseSuccessfulJson<T>(
  res: Response,
  attempts: number,
): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch (error) {
    if (isAbortError(error)) throw error;
    const requestId = res.headers?.get("x-request-id") ?? undefined;
    throw new ApiRequestError(
      res.status,
      "INVALID_RESPONSE",
      "The server returned an invalid response.",
      requestId,
      { kind: "invalid_response", attempts, cause: error },
    );
  }
}

async function parseSuccessfulText(
  res: Response,
  attempts: number,
): Promise<string> {
  try {
    return await res.text();
  } catch (error) {
    if (isAbortError(error)) throw error;
    const requestId = res.headers?.get("x-request-id") ?? undefined;
    throw new ApiRequestError(
      res.status,
      "INVALID_RESPONSE",
      "The server returned an invalid response.",
      requestId,
      { kind: "invalid_response", attempts, cause: error },
    );
  }
}

export const MAX_RETRIES = 2;
export const MAX_ATTEMPTS = MAX_RETRIES + 1;
export const MAX_TIMEOUT_MS = 2_147_483_647;
const INITIAL_BACKOFF_MS = 500;
const MAX_TOTAL_BACKOFF_MS = Array.from(
  { length: MAX_RETRIES },
  (_, attempt) => INITIAL_BACKOFF_MS * 2 ** attempt * 2,
).reduce((total, delay) => total + delay, 0);

/**
 * Uses equal jitter so retries retain exponential growth while callers that
 * fail together do not retry in lockstep. Each delay is between one and two
 * times the exponential base delay.
 */
export function retryDelayMs(attempt: number): number {
  const baseDelay = INITIAL_BACKOFF_MS * 2 ** attempt;
  return baseDelay + Math.random() * baseDelay;
}

/**
 * Configured elapsed-time ceiling for a request that uses all attempts.
 * Each attempt includes response-body consumption; backoff uses the maximum
 * delay allowed by {@link retryDelayMs}.
 */
function validateTimeoutMs(timeoutMs: number): number {
  if (
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 0 ||
    timeoutMs > MAX_TIMEOUT_MS
  ) {
    throw new RangeError(
      `timeout must be an integer between 0 and ${MAX_TIMEOUT_MS} milliseconds`,
    );
  }
  return timeoutMs;
}

export function requestElapsedCeilingMs(timeoutMs: number): number {
  validateTimeoutMs(timeoutMs);
  return MAX_ATTEMPTS * timeoutMs + MAX_TOTAL_BACKOFF_MS;
}

/** True if `err` represents a deliberately aborted fetch/signal. */
export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException || err instanceof Error) &&
    err.name === "AbortError"
  );
}

/** Classifies any caught value without requiring consumers to inspect names or codes. */
export function classifyApiError(error: unknown): ApiErrorKind {
  if (isAbortError(error)) return "aborted";
  if (error instanceof ApiRequestError) return error.kind;
  return "unknown";
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("signal is aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("signal is aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export type RetryPolicy = "idempotent" | "never";

function isAutomaticallyRetryableMethod(method?: string): boolean {
  const normalizedMethod = method?.toUpperCase();
  return (
    !normalizedMethod ||
    normalizedMethod === "GET" ||
    normalizedMethod === "HEAD"
  );
}

function canRetry(method: string | undefined, policy?: RetryPolicy): boolean {
  if (policy === "never") return false;
  return policy === "idempotent" || isAutomaticallyRetryableMethod(method);
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
  /**
   * Explicit semantic retry contract. Omit to retry only GET/HEAD; use
   * `idempotent` only when repeating the operation has the same intended effect.
   */
  retry?: RetryPolicy;
}

export let globalDefaultTimeoutMs = 10000;

export function setDefaultTimeout(ms: number) {
  globalDefaultTimeoutMs = validateTimeoutMs(ms);
}

function composeSignals(
  timeoutMs: number,
  callerSignal?: AbortSignal | null,
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
    // requestWithRetry checks an already-aborted caller before composing.
    // JavaScript cannot dispatch an abort between that check and this
    // synchronous listener registration.
    callerSignal.addEventListener("abort", onCallerAbort, { once: true });
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

function timeoutError(attempts: number, retryAllowed: boolean): ApiRequestError {
  return new ApiRequestError(
    undefined,
    "TIMEOUT",
    "The request timed out. Try again.",
    undefined,
    { kind: "timeout", retryable: retryAllowed, attempts },
  );
}

function networkError(
  error: unknown,
  attempts: number,
  retryAllowed: boolean,
): ApiRequestError {
  return new ApiRequestError(
    undefined,
    "NETWORK_ERROR",
    "Unable to reach the server. Check your connection and try again.",
    undefined,
    { kind: "network", retryable: retryAllowed, attempts, cause: error },
  );
}

type ResponseParser<T> = (response: Response, attempts: number) => Promise<T>;

async function requestWithRetry<T>(
  path: string,
  init: ApiRequestInit | undefined,
  parseSuccess: ResponseParser<T>,
): Promise<T> {
  const { timeout, retry, ...requestInit } = init ?? {};
  const method = requestInit.method;
  const timeoutMs = validateTimeoutMs(timeout ?? globalDefaultTimeoutMs);
  const retryAllowed = canRetry(method, retry);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const attempts = attempt + 1;
    if (requestInit.signal?.aborted) {
      throw new DOMException("signal is aborted", "AbortError");
    }

    const { signal, cleanup, hasTimedOut } = composeSignals(
      timeoutMs,
      requestInit.signal,
    );
    try {
      const response = await doFetch(path, { ...requestInit, signal });

      if (response.ok) {
        return await parseSuccess(response, attempts);
      }

      const error = await parseError(response, attempts, retryAllowed);
      if (!retryAllowed || !error.retryable || attempts === MAX_ATTEMPTS) {
        throw error;
      }
    } catch (error) {
      if (hasTimedOut()) {
        const failure = timeoutError(attempts, retryAllowed);
        if (!retryAllowed || attempts === MAX_ATTEMPTS) throw failure;
      } else if (isAbortError(error)) {
        throw error;
      } else if (error instanceof ApiRequestError) {
        throw error;
      } else {
        const failure = networkError(error, attempts, retryAllowed);
        if (!retryAllowed || attempts === MAX_ATTEMPTS) throw failure;
      }
    } finally {
      cleanup();
    }

    // All transient failures share the deliberate exponential-jitter policy,
    // preventing correlated network failures and timeouts from retrying in lockstep.
    await sleep(retryDelayMs(attempt), requestInit.signal ?? undefined);
  }

  throw new Error("Request retry loop ended unexpectedly");
}

/**
 * Performs a JSON request against the API and returns the parsed body.
 * Throws {@link ApiRequestError} on a non-2xx response or when a successful
 * response cannot be parsed as JSON.
 * Retries up to {@link MAX_RETRIES} times on transient HTTP, timeout, or
 * network failures when the operation is idempotent.
 */
export async function apiRequest<T>(
  path: string,
  init?: ApiRequestInit,
): Promise<T> {
  return requestWithRetry(path, init, parseSuccessfulJson<T>);
}

/**
 * Performs a request against the API and returns the response as text (e.g. CSV).
 * Throws {@link ApiRequestError} on a non-2xx response.
 * Retries up to {@link MAX_RETRIES} times on transient HTTP, timeout, or
 * network failures when the operation is idempotent.
 */
export async function apiTextRequest(
  path: string,
  init?: ApiRequestInit,
): Promise<string> {
  return requestWithRetry(path, init, parseSuccessfulText);
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
    // Quote calculation has no server-side mutation, so repeating it is safe.
    retry: "idempotent",
  });
}
