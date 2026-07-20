"use client";

import Link from "next/link";
import { Settlement } from "@/lib/types";
import { formatAmount } from "@/lib/format";
import { useSortableData, SortState } from "@/hooks/useSortableData";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./EmptyState";

type SortKey = "anchor" | "amount" | "status";

function getSortValue(settlement: Settlement, key: SortKey): string | number {
  return settlement[key];
}

/** Renders settlements with execute/cancel actions for pending rows. */
export function SettlementTable({
  settlements,
  onExecute,
  onCancel,
}: {
  settlements: Settlement[];
  onExecute?: (id: number) => void;
  onCancel?: (id: number) => void;
}) {
  const { sorted, sort, requestSort } = useSortableData<Settlement, SortKey>(
    settlements,
    getSortValue,
  );

  if (settlements.length === 0) {
    return <EmptyState message="No settlements yet." />;
  }

  const actionable = Boolean(onExecute || onCancel);

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800 text-zinc-400">
          <th className="py-2 font-medium">#</th>
          <SortableHeader
            label="Anchor"
            sortKey="anchor"
            sort={sort}
            onSort={requestSort}
          />
          <th className="py-2 font-medium">Asset</th>
          <SortableHeader
            label="Amount"
            sortKey="amount"
            sort={sort}
            onSort={requestSort}
          />
          <th className="py-2 font-medium">Fee</th>
          <SortableHeader
            label="Status"
            sortKey="status"
            sort={sort}
            onSort={requestSort}
          />
          {actionable ? <th className="py-2" /> : null}
        </tr>
      </thead>
      <tbody>
        {sorted.map((s) => (
          <tr key={s.id} className="border-b border-zinc-900">
            <td className="py-2 text-zinc-500">
              <Link href={`/settlements/${s.id}`} className="hover:underline">
                {s.id}
              </Link>
            </td>
            <td className="py-2 font-mono text-xs text-zinc-300">{s.anchor}</td>
            <td className="py-2 font-mono text-zinc-100">{s.asset}</td>
            <td className="py-2 text-zinc-200">{formatAmount(s.amount)}</td>
            <td className="py-2 text-zinc-400">{formatAmount(s.fee)}</td>
            <td className="py-2">
              <StatusBadge status={s.status} />
            </td>
            {actionable ? (
              <td className="py-2 text-right">
                {s.status === "pending" ? (
                  <span className="flex justify-end gap-2">
                    {onExecute ? (
                      <button
                        onClick={() => onExecute(s.id)}
                        className="rounded-md px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        Execute
                      </button>
                    ) : null}
                    {onCancel ? (
                      <button
                        onClick={() => onCancel(s.id)}
                        className="rounded-md px-2 py-1 text-xs text-red-400 hover:text-red-300"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState<SortKey> | null;
  onSort: (key: SortKey) => void;
}) {
  const active = sort?.key === sortKey;
  const indicator = active ? (sort?.direction === "asc" ? "▲" : "▼") : "";
  const ariaSort = !active
    ? "none"
    : sort?.direction === "asc"
      ? "ascending"
      : "descending";

  return (
    <th className="py-2 font-medium" aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
        className="flex items-center gap-1 rounded-sm px-1 py-0.5 hover:text-zinc-200 focus-visible:border focus-visible:border-zinc-600 focus-visible:outline-none"
      >
        {label}
        <span className="w-2 text-[10px] text-zinc-500">{indicator}</span>
      </button>
    </th>
  );
}
