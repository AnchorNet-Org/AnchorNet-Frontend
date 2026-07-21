"use client";

import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

/** The column currently sorted, and its direction. */
export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

/**
 * Sorts `items` by a chosen column, without mutating the input array.
 *
 * Clicking the same column cycles ascending -> descending -> unsorted;
 * clicking a different column always starts from ascending. `getValue`
 * extracts the comparable value for a given column key.
 *
 * `clearSort` resets the sort state to `null` in one call, regardless of
 * the current sort key or direction.
 */
export function useSortableData<T, K extends string>(
  items: T[],
  getValue: (item: T, key: K) => string | number,
  initial: SortState<K> | null = null,
): {
  sorted: T[];
  sort: SortState<K> | null;
  requestSort: (key: K) => void;
  clearSort: () => void;
} {
  const [sort, setSort] = useState<SortState<K> | null>(initial);

  const requestSort = useCallback((key: K) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }, []);

  const clearSort = useCallback(() => {
    setSort(null);
  }, []);

  const sorted = useMemo(() => {
    if (!sort) return items;
    const { key, direction } = sort;
    const factor = direction === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = getValue(a, key);
      const vb = getValue(b, key);
      if (va < vb) return -factor;
      if (va > vb) return factor;
      return 0;
    });
  }, [items, sort, getValue]);

  return { sorted, sort, requestSort, clearSort };
}
