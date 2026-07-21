/**
 * API client for settlement endpoints.
 */

import { apiRequest, apiTextRequest } from "./api";
import { Settlement, SettlementsPage } from "./types";

/** Options for {@link fetchSettlements}. */
export interface FetchSettlementsOptions {
  /** Restrict results to a single anchor. */
  anchor?: string;
  /** 1-based page number (server defaults to 1). */
  page?: number;
  /** Page size (server defaults to 20, caps at 100). */
  pageSize?: number;
  signal?: AbortSignal;
}

/** Fetches a page of settlements, optionally filtered by anchor. */
export async function fetchSettlements(
  options: FetchSettlementsOptions = {},
): Promise<SettlementsPage> {
  const { anchor, page, pageSize, signal } = options;
  const params = new URLSearchParams();
  if (anchor) params.set("anchor", anchor);
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<SettlementsPage>(`/api/v1/settlements${query}`, {
    signal,
  });
}

/** Fetches settlements as CSV, optionally filtered by anchor. */
export async function exportSettlementsCsv(
  options: FetchSettlementsOptions = {},
): Promise<string> {
  const { anchor, page, pageSize, signal } = options;
  const params = new URLSearchParams();
  if (anchor) params.set("anchor", anchor);
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  params.set("format", "csv");
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiTextRequest(`/api/v1/settlements${query}`, { signal });
}

/** Fetches a single settlement by id. */
export async function fetchSettlement(
  id: number,
  signal?: AbortSignal,
): Promise<Settlement> {
  return apiRequest<Settlement>(`/api/v1/settlements/${id}`, { signal });
}

/** Opens a new settlement, reserving liquidity. */
export async function openSettlement(input: {
  anchor: string;
  asset: string;
  amount: number;
}): Promise<Settlement> {
  return apiRequest<Settlement>("/api/v1/settlements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Executes a pending settlement. */
export async function executeSettlement(id: number): Promise<Settlement> {
  return apiRequest<Settlement>(`/api/v1/settlements/${id}/execute`, {
    method: "POST",
  });
}

/** Cancels a pending settlement. */
export async function cancelSettlement(id: number): Promise<Settlement> {
  return apiRequest<Settlement>(`/api/v1/settlements/${id}/cancel`, {
    method: "POST",
  });
}
