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

/** Formats an ISO timestamp as a short date, or "—" if absent/invalid. */
export function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}
