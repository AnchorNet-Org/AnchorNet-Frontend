"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  fetchSettlements,
  openSettlement,
  executeSettlement,
  cancelSettlement,
  exportSettlementsCsv,
} from "@/lib/settlementsApi";
import { Settlement, Pagination, Pool } from "@/lib/types";
import { fetchPools } from "@/lib/api";
import { pluralize } from "@/lib/format";
import { matchesQuery } from "@/lib/search";
import { useToast } from "@/hooks/useToast";
import { useFocusShortcut } from "@/hooks/useFocusShortcut";
import { useQueryState } from "@/hooks/useQueryState";
import { Card } from "./Card";
import { TableSkeleton } from "./TableSkeleton";
import { SettlementForm } from "./SettlementForm";
import { SettlementTable } from "./SettlementTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";

/** Selectable page sizes for the settlements list; the first is the default. */
const PAGE_SIZE_OPTIONS = [10, 25, 50];

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; settlements: Settlement[]; pagination: Pagination };

/**
 * Parses and validates a page-size value from a string.
 * Returns the parsed value if it is one of the allowed options, otherwise the
 * first (default) option.
 */
function parsePageSize(raw: string): number {
  const n = Number(raw);
  return PAGE_SIZE_OPTIONS.includes(n) ? n : PAGE_SIZE_OPTIONS[0];
}

/** Client panel for opening and managing settlements. */
export function SettlementsPanel() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  // Screen-reader announcement for how many rows the last "Load more" added.
  // Empty on initial load so nothing is announced until the user paginates.
  const [loadMoreAnnouncement, setLoadMoreAnnouncement] = useState("");
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const { notify } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  useFocusShortcut("/", searchRef);

  // Sync search query and page size to/from the URL querystring.
  // Initial values are hydrated from the URL on first render.
  const [query, setQuery] = useQueryState("q", "");
  const [rawPageSize, setRawPageSize] = useQueryState(
    "pageSize",
    String(PAGE_SIZE_OPTIONS[0]),
  );
  const pageSize = parsePageSize(rawPageSize);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setMoreError(null);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // The "loading" transition happens at the call site that changes `nonce`
    // or `pageSize` (reload(), changePageSize()) rather than here, since
    // setting state synchronously in an effect body triggers a cascading
    // re-render (react-hooks/set-state-in-effect). The initial state is
    // already "loading" from useState's initializer above.
    fetchSettlements({ page: 1, pageSize, signal: controller.signal })
      .then(({ settlements, pagination }) =>
        setState({ status: "ready", settlements, pagination }),
      )
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Request failed",
        });
      });
    return () => controller.abort();
  }, [nonce, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPools(controller.signal)
      .then(setPools)
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Failed to load pools", err);
        }
      });
    return () => controller.abort();
  }, []);

  const availableLiquidity = useMemo(() => {
    if (pools.length === 0) return undefined;
    return pools.reduce((acc, pool) => {
      acc[pool.asset] = pool.total;
      return acc;
    }, {} as Record<string, number>);
  }, [pools]);

  /** Switches the page size and reloads from page 1. */
  function changePageSize(size: number) {
    setState({ status: "loading" });
    setRawPageSize(String(size));
  }

  async function loadMore() {
    if (state.status !== "ready") return;
    setLoadingMore(true);
    setMoreError(null);
    // Clear so an identical follow-up announcement still triggers a change.
    setLoadMoreAnnouncement("");
    try {
      const next = await fetchSettlements({
        page: state.pagination.page + 1,
        pageSize,
      });
      setState((prev) =>
        prev.status === "ready"
          ? {
              status: "ready",
              settlements: [...prev.settlements, ...next.settlements],
              pagination: next.pagination,
            }
          : prev,
      );
      setLoadMoreAnnouncement(
        `Loaded ${pluralize(next.settlements.length, "more settlement")}`,
      );
    } catch (err: unknown) {
      setMoreError(
        err instanceof Error ? err.message : "Failed to load more settlements",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  async function runSettlementAction(
    action: () => Promise<Settlement>,
    successMessage: string,
  ) {
    try {
      const updatedSettlement = await action();
      setState((previous) =>
        previous.status === "ready"
          ? {
              ...previous,
              settlements: previous.settlements.map((settlement) =>
                settlement.id === updatedSettlement.id
                  ? updatedSettlement
                  : settlement,
              ),
            }
          : previous,
      );
      notify("success", successMessage);
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Request failed");
    }
  }

  async function open(input: {
    anchor: string;
    asset: string;
    amount: number;
  }): Promise<boolean> {
    setPending(true);
    try {
      await openSettlement(input);
      notify("success", `Opened a settlement for ${input.amount} ${input.asset}.`);
      reload();
      return true;
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Request failed");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const csvText = await exportSettlementsCsv({ pageSize });
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "settlements.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify("success", "Exported settlements as CSV.");
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }

  const visibleSettlements =
    state.status === "ready"
      ? state.settlements.filter((s) =>
          matchesQuery([s.id, s.anchor, s.asset], query),
        )
      : [];

  return (
    <div className="space-y-6">
      {/* Always-mounted live region so screen readers pick up text changes. */}
      <div aria-live="polite" className="sr-only">
        {loadMoreAnnouncement}
      </div>
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">
          Open settlement
        </h2>
        <SettlementForm onSubmit={open} pending={pending} availableLiquidity={availableLiquidity} />
      </Card>
      <Card>
        {state.status === "loading" ? (
          <TableSkeleton columns={6} />
        ) : state.status === "error" ? (
          <p className="text-sm text-red-400">{state.message}</p>
        ) : (
          <>
            {state.settlements.length > 0 ? (
              <div role="search" aria-label="Settlements export, page size, and search" className="mb-3 flex flex-wrap items-center justify-end gap-2">
                {/* Note: Matching frontend search semantics server-side isn't feasible in scope.
                    We explicitly document that the export covers the full dataset. */}
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  title={query ? "Export includes all settlements, ignoring the current search filter" : undefined}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                >
                  {exporting ? "Exporting…" : "Export CSV"}
                </button>
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  Rows per page
                  <select
                    value={pageSize}
                    onChange={(e) => changePageSize(Number(e.target.value))}
                    aria-label="Rows per page"
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search settlements… (/)"
                  aria-label="Search settlements"
                  className="w-full max-w-48 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-zinc-600"
                />
              </div>
            ) : null}
            {visibleSettlements.length === 0 && state.settlements.length > 0 ? (
              <EmptyState
                reason="no-results"
                message="No settlements match your search."
                onClearFilters={() => setQuery("")}
              />
            ) : (
              <SettlementTable
                settlements={visibleSettlements}
                onExecute={(id) =>
                  runSettlementAction(
                    () => executeSettlement(id),
                    `Executed settlement #${id}.`,
                  )
                }
                onCancel={setPendingCancelId}
              />
            )}
            {state.pagination.page < state.pagination.totalPages ? (
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
                {moreError ? (
                  <p className="text-xs text-red-400">{moreError}</p>
                ) : null}
              </div>
            ) : state.settlements.length > 0 ? (
              <p className="mt-4 text-center text-xs text-zinc-500">
                Showing all {pluralize(state.pagination.total, "settlement")}
              </p>
            ) : null}
          </>
        )}
      </Card>
      <ConfirmDialog
        open={pendingCancelId !== null}
        title="Cancel settlement"
        message={`Cancel settlement #${pendingCancelId}? Reserved liquidity will be released.`}
        confirmLabel="Cancel settlement"
        cancelLabel="Keep settlement"
        onCancel={() => setPendingCancelId(null)}
        onConfirm={() => {
          const id = pendingCancelId;
          setPendingCancelId(null);
          if (id !== null) {
            runSettlementAction(
              () => cancelSettlement(id),
              `Cancelled settlement #${id}.`,
            );
          }
        }}
      />
    </div>
  );
}
