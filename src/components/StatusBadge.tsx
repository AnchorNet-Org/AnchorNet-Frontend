import { SettlementStatus } from "@/lib/types";
import { formatStatus } from "@/lib/format";

const STYLES: Record<SettlementStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  executed: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
};

/** Neutral styling for a status outside the known {@link SettlementStatus} set. */
const FALLBACK_STYLE = "bg-slate-500/15 text-slate-300 ring-slate-500/30";

/** A coloured pill showing a settlement's lifecycle status. */
export function StatusBadge({ status }: { status: SettlementStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status] ?? FALLBACK_STYLE}`}
    >
      {formatStatus(status)}
    </span>
  );
}
