/**
 * Presentation helpers for formatting amounts and labels.
 */

/** Formats an amount with thousands separators and up to 7 fractional digits (e.g. 1234.5678 -> "1,234.5678", 1000 -> "1,000"). */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 7,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Formats a count with a pluralized noun (e.g. (1, "anchor") -> "1 anchor"). */
export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Renders a fee in basis points from a fee/amount pair (e.g. 1/1000 -> "10 bps"). */
export function feeInBps(fee: number, amount: number): string {
  if (amount <= 0) return "0 bps";
  return `${Math.round((fee / amount) * 10_000)} bps`;
}

/** Capitalizes a settlement status for display (e.g. "pending" -> "Pending"). */
export function formatStatus(status: string): string {
  if (status.length === 0) return status;
  return status[0].toUpperCase() + status.slice(1);
}

/**
 * Formats an ISO timestamp as a short, sortable date string (YYYY-MM-DD)
 * in the local time zone of the executing environment.
 *
 * Falls back to "—" when the input is empty or not a valid date.
 *
 * Note: this uses the *local* time zone of wherever the code runs (browser
 * or server), not a fixed zone. If this function ever needs to render a
 * date in a specific user time zone regardless of runtime, it should be
 * updated to accept an explicit `timeZone` and use `Intl.DateTimeFormat`.
 */
export function formatDate(iso: string): string {
  if (!iso) return "—";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  // Use local getters (not toISOString, which is always UTC) so that
  // timestamps near midnight resolve to the calendar day the viewer
  // actually experienced, not the UTC-equivalent day.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // getMonth() is 0-indexed
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Formats a number as a percentage string with given decimal places (default 1). */
export function formatPercent(value: number, digits: number = 1): string {
  return `${value.toFixed(digits)}%`;
}
