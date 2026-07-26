"use client";

import { useEffect, useRef, useState } from "react";
import { SortState } from "@/hooks/useSortableData";

export interface SortAnnouncerProps<K extends string> {
  sort: SortState<K> | null;
  labels: Record<K, string>;
}

/**
 * A visually hidden component that announces sort changes to screen readers
 * via an aria-live region. No announcement is made on initial mount.
 */
export function SortAnnouncer<K extends string>({
  sort,
  labels,
}: SortAnnouncerProps<K>) {
  const [announcement, setAnnouncement] = useState("");
  const prevSortRef = useRef<SortState<K> | null>(sort);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const prevSort = prevSortRef.current;
    if (prevSort?.key === sort?.key && prevSort?.direction === sort?.direction) {
      return;
    }
    prevSortRef.current = sort;

    if (sort) {
      const label = labels[sort.key] || String(sort.key);
      const direction = sort.direction === "asc" ? "ascending" : "descending";
      setAnnouncement(`Sorted by ${label}, ${direction}`);
    } else {
      setAnnouncement("Sorting cleared");
    }
  }, [sort, labels]);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
