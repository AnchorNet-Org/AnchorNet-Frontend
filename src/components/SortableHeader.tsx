"use client";

import { SortState } from "@/hooks/useSortableData";

/** A sortable `<th>` with aria-sort and a click-to-sort button, shared across tables. */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: K;
  sort: SortState<K> | null;
  onSort: (key: K) => void;
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
        className="flex items-center gap-1 hover:text-zinc-200"
      >
        {label}
        <span className="w-2 text-[10px] text-zinc-500">{indicator}</span>
      </button>
    </th>
  );
}
