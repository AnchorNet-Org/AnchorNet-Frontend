"use client";

import { useCallback, useRef, useState } from "react";
import {
  fetchAnchors,
  registerAnchor,
  deregisterAnchor,
} from "@/lib/anchorsApi";
import { Anchor } from "@/lib/types";
import { matchesQuery } from "@/lib/search";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { useFocusShortcut } from "@/hooks/useFocusShortcut";
import { useQueryState } from "@/hooks/useQueryState";
import { Card } from "./Card";
import { TableSkeleton } from "./TableSkeleton";
import { AnchorForm } from "./AnchorForm";
import { AnchorTable } from "./AnchorTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";

type StatusFilter = "all" | "active" | "inactive";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/** Returns true if `value` is a valid {@link StatusFilter}. */
function isStatusFilter(value: string): value is StatusFilter {
  return value === "all" || value === "active" || value === "inactive";
}

/** Filters anchors by lifecycle status for the client-side status tabs. */
function filterAnchors(anchors: Anchor[], filter: StatusFilter): Anchor[] {
  return anchors.filter((anchor) => {
    if (filter === "active") return anchor.active;
    if (filter === "inactive") return !anchor.active;
    return true;
  });
}

/** Client panel for listing and managing anchors. */
export function AnchorsPanel() {
  const load = useCallback((signal: AbortSignal) => fetchAnchors(signal), []);
  const { state, reload } = useAsync(load);
  const { notify } = useToast();
  const [pending, setPending] = useState(false);
  const [pendingDeregisterId, setPendingDeregisterId] = useState<
    string | null
  >(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useFocusShortcut("/", searchRef);

  // Sync status filter and search query to the URL querystring.
  // Initial values are hydrated from the URL on first render.
  const [rawStatus, setStatus] = useQueryState("status", "all");
  const filter: StatusFilter = isStatusFilter(rawStatus) ? rawStatus : "all";

  const [query, setQuery] = useQueryState("q", "");

  const filteredAnchors =
    state.status === "ready"
      ? filterAnchors(state.data, filter).filter((anchor) =>
          matchesQuery([anchor.id, anchor.name], query),
        )
      : [];

  async function register(input: { id: string; name?: string }) {
    setPending(true);
    try {
      await registerAnchor(input);
      notify("success", `Registered anchor "${input.id}".`);
      reload();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }

  async function deregister(id: string) {
    try {
      await deregisterAnchor(id);
      notify("success", `Deactivated anchor "${id}".`);
      reload();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Deactivation failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Register anchor
        </h2>
        <AnchorForm onSubmit={register} pending={pending} />
      </Card>
      <Card>
        {state.status === "loading" ? (
          <TableSkeleton columns={3} />
        ) : state.status === "error" ? (
          <p className="text-sm text-red-400">{state.message}</p>
        ) : (
          <>
            {state.data.length > 0 ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatus(f.value)}
                    aria-pressed={filter === f.value}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filter === f.value
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search anchors… (/)"
                  aria-label="Search anchors"
                  className="ml-auto w-full max-w-48 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
                />
              </div>
            ) : null}
            {filteredAnchors.length === 0 && state.data.length > 0 ? (
              <EmptyState
                reason="no-results"
                message="No anchors match your search or filter."
                onClearFilters={() => {
                  setStatus("all");
                  setQuery("");
                }}
              />
            ) : (
              <AnchorTable
                anchors={filteredAnchors}
                onDeregister={setPendingDeregisterId}
              />
            )}
          </>
        )}
      </Card>
      <ConfirmDialog
        open={pendingDeregisterId !== null}
        title="Deactivate anchor"
        message={`Deactivate anchor "${pendingDeregisterId}"? It will stop receiving new settlements.`}
        confirmLabel="Deactivate"
        onCancel={() => setPendingDeregisterId(null)}
        onConfirm={() => {
          const id = pendingDeregisterId;
          setPendingDeregisterId(null);
          if (id) deregister(id);
        }}
      />
    </div>
  );
}
