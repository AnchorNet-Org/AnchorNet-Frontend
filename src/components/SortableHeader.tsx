"use client";

import { SortState } from "@/hooks/useSortableData";

/**
 * A sortable `<th>` with aria-sort, a click-to-sort button, and a reset control
 * for the active sort. The reset is only shown when this column is sorted.
 */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  onClearSort,
}: {
  label: string;
  sortKey: K;
  sort: SortState<K> | null;
  onSort: (key: K) => void;
  onClearSort?: () => void;
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
      {active && onClearSort ? (
        <button
          type="button"
          onClick={onClearSort}
          className="ml-1 rounded-sm px-1 py-0.5 text-xs text-zinc-500 hover:text-zinc-200 focus-visible:border focus-visible:border-zinc-600 focus-visible:outline-none"
        >
          Reset sort
        </button>
      ) : null}
    </th>
  );
}
