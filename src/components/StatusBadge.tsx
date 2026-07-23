"use client";

import { useEffect, useRef, useState } from "react";
import { SettlementStatus, isSettlementStatus } from "@/lib/types";
import { formatStatus } from "@/lib/format";

const STYLES: Record<SettlementStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  executed: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  cancelled: "bg-zinc-500/30 text-zinc-100 ring-zinc-500/30",
};

/** Neutral styling for a status outside the known {@link SettlementStatus} set. */
const FALLBACK_STYLE = "bg-slate-500/15 text-slate-300 ring-slate-500/30";

/** A coloured pill showing a settlement's lifecycle status. */
export function StatusBadge({ status }: { status: SettlementStatus }) {
  const previousStatus = useRef(status);
  const [announcement, setAnnouncement] = useState("");

  // Determine if status is valid at runtime
  const isValid = isSettlementStatus(status);

  // Use fallback values when status is invalid
  const safeStatus = isValid ? status : "unknown" as SettlementStatus;

  useEffect(() => {
    if (safeStatus !== previousStatus.current) {
      previousStatus.current = safeStatus;
      // Record transitions for screen reader announcements
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnnouncement(formatStatus(safeStatus));
    }
  }, [safeStatus]);

  return (
    <>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[safeStatus] ?? FALLBACK_STYLE}`}
      >
        {formatStatus(safeStatus)}
      </span>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}
