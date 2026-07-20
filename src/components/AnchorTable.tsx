"use client";

import Link from "next/link";
import { Anchor } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useSortableData, SortState } from "@/hooks/useSortableData";
import { EmptyState } from "./EmptyState";

type SortKey = "name" | "registeredAt" | "active";

function getSortValue(anchor: Anchor, key: SortKey): string | number {
  if (key === "active") return anchor.active ? 1 : 0;
  return anchor[key];
}

/** Renders registered anchors with an optional deregister action. */
export function AnchorTable({
  anchors,
  onDeregister,
}: {
  anchors: Anchor[];
  onDeregister?: (id: string) => void;
}) {
  const { sorted, sort, requestSort } = useSortableData<Anchor, SortKey>(
    anchors,
    getSortValue,
  );

  if (anchors.length === 0) {
    return <EmptyState message="No anchors registered yet." />;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800 text-zinc-400">
          <SortableHeader
            label="Anchor"
            sortKey="name"
            sort={sort}
            onSort={requestSort}
          />
          <SortableHeader
            label="Registered"
            sortKey="registeredAt"
            sort={sort}
            onSort={requestSort}
          />
          <SortableHeader
            label="Status"
            sortKey="active"
            sort={sort}
            onSort={requestSort}
          />
          {onDeregister ? <th className="py-2" /> : null}
        </tr>
      </thead>
      <tbody>
        {sorted.map((anchor) => (
          <tr key={anchor.id} className="border-b border-zinc-900">
            <td className="py-2">
              <Link
                href={`/anchors/${encodeURIComponent(anchor.id)}`}
                className="block hover:underline"
              >
                <div className="text-zinc-100">{anchor.name}</div>
                <div className="font-mono text-xs text-zinc-500">
                  {anchor.id}
                </div>
              </Link>
            </td>
            <td className="py-2 text-zinc-400">
              {formatDate(anchor.registeredAt)}
            </td>
            <td className="py-2 text-zinc-300">
              {anchor.active ? "Active" : "Inactive"}
            </td>
            {onDeregister ? (
              <td className="py-2 text-right">
                {anchor.active ? (
                  <button
                    onClick={() => onDeregister(anchor.id)}
                    className="rounded-md px-2 py-1 text-xs text-red-400 hover:text-red-300"
                  >
                    Deactivate
                  </button>
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
