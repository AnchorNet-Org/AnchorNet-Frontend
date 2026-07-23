"use client";

import Link from "next/link";
import { Anchor } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { useSortableData } from "@/hooks/useSortableData";
import { EmptyState } from "./EmptyState";
import { SortableHeader } from "./SortableHeader";

type SortKey = "name" | "registeredAt" | "active";

function getSortValue(anchor: Anchor, key: SortKey): string | number {
  if (key === "active") return anchor.active ? 1 : 0;
  return anchor[key];
}

/** Renders registered anchors with an optional deregister action. */
export function AnchorTable({
  anchors,
  onDeregister,
  deregisteringIds,
}: {
  anchors: Anchor[];
  onDeregister?: (id: string) => void;
  /** Ids of anchors with a deactivation currently in flight. */
  deregisteringIds?: Set<string>;
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
                    disabled={deregisteringIds?.has(anchor.id) ?? false}
                    aria-disabled={deregisteringIds?.has(anchor.id) ?? false}
                    className={`rounded-md px-2 py-1 text-xs ${
                      deregisteringIds?.has(anchor.id)
                        ? "cursor-not-allowed text-red-400/40"
                        : "text-red-400 hover:text-red-300"
                    }`}
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

