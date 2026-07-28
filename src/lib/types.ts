/**
 * Shared types mirroring the AnchorNet API contract.
 */

/** Aggregate liquidity available for an asset across all anchors. */
export interface Pool {
  asset: string;
  total: number;
  anchors: number;
}

/** A request to route `amount` of `asset` through available liquidity. */
export interface QuoteRequest {
  asset: string;
  amount: number;
}

/** A computed routing quote for a {@link QuoteRequest}. */
export interface Quote {
  asset: string;
  amount: number;
  fee: number;
  deliverable: number;
  route: string[];
}

/** Error envelope returned by the API. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

/** A registered liquidity-providing anchor. */
export interface Anchor {
  id: string;
  name: string;
  registeredAt: string;
  active: boolean;
}

/** All valid lifecycle states of a settlement, in canonical order. */
export const SETTLEMENT_STATUSES = ["pending", "executed", "cancelled"] as const;

/** Runtime type guard for SettlementStatus values. */
export function isSettlementStatus(value: unknown): value is SettlementStatus {
  return typeof value === "string" && (SETTLEMENT_STATUSES as readonly string[]).includes(value);
}

/** Lifecycle state of a settlement. */
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

/** A cross-anchor settlement drawing on pool liquidity. */
export interface Settlement {
  id: number;
  anchor: string;
  asset: string;
  amount: number;
  fee: number;
  status: SettlementStatus;
  createdAt: string;
}

/** Aggregate network metrics. */
export interface Metrics {
  anchors: number;
  activeAnchors: number;
  pools: number;
  totalLiquidity: number;
  settlements: number;
  pendingSettlements: number;
}

/** Offset-based pagination metadata returned alongside a page of results. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** A single page of settlements plus its pagination metadata. */
export interface SettlementsPage {
  settlements: Settlement[];
  pagination: Pagination;
}
