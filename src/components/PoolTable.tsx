"use client";

import { Pool } from "@/lib/types";
import { formatAmount, pluralize } from "@/lib/format";
import { useSortableData } from "@/hooks/useSortableData";
import { EmptyState } from "./EmptyState";
import { SortableHeader } from "./SortableHeader";

type SortKey = "asset" | "total" | "anchors";

function getSortValue(pool: Pool, key: SortKey): string | number {
  return pool[key];
}

/** Renders aggregated liquidity pools as a sortable table. */
export function PoolTable({ pools }: { pools: Pool[] }) {
  const { sorted, sort, requestSort } = useSortableData<Pool, SortKey>(
    pools,
    getSortValue,
  );

  if (pools.length === 0) {
    return (
      <EmptyState message="No liquidity pools yet. Provide liquidity via the API to see them here." />
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800 text-zinc-400">
          <SortableHeader
            label="Asset"
            sortKey="asset"
            sort={sort}
            onSort={requestSort}
          />
          <SortableHeader
            label="Total liquidity"
            sortKey="total"
            sort={sort}
            onSort={requestSort}
          />
          <SortableHeader
            label="Anchors"
            sortKey="anchors"
            sort={sort}
            onSort={requestSort}
          />
        </tr>
      </thead>
      <tbody>
        {sorted.map((pool) => (
          <tr key={pool.asset} className="border-b border-zinc-900">
            <td className="py-2 font-mono text-zinc-100">{pool.asset}</td>
            <td className="py-2 text-zinc-200">{formatAmount(pool.total)}</td>
            <td className="py-2 text-zinc-400">
              {pluralize(pool.anchors, "anchor")}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-zinc-700">
          <td className="py-2 text-zinc-400 font-medium">Total</td>
          <td className="py-2 text-zinc-200 font-medium">
            {formatAmount(pools.reduce((sum, p) => sum + p.total, 0))}
          </td>
          <td className="py-2 text-zinc-400 font-medium">
            {pluralize(
              pools.reduce((sum, p) => sum + p.anchors, 0),
              "anchor",
            )}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

