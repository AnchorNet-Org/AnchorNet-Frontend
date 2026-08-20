"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  fetchSettlements,
  openSettlement,
  executeSettlement,
  cancelSettlement,
  exportSettlementsCsv,
} from "@/lib/settlementsApi";
import { Settlement, Pagination } from "@/lib/types";
import { fetchPools } from "@/lib/api";
import { useAsync } from "@/hooks/useAsync";
import { pluralize } from "@/lib/format";
import { matchesQuery } from "@/lib/search";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useToast } from "@/hooks/useToast";
import { apiErrorMessage } from "@/lib/toast";
import { useFocusShortcut } from "@/hooks/useFocusShortcut";
import { useQueryState } from "@/hooks/useQueryState";
import { Card } from "./Card";
import { TableSkeleton } from "./TableSkeleton";
import { SettlementForm } from "./SettlementForm";
import { SettlementTable } from "./SettlementTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";

/**
 * Delay (ms) before a paused search query is applied to the filtered list.
 * The input itself stays bound to the immediate value, so typing never lags.
 */
const SEARCH_DEBOUNCE_MS = 200;

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

/** Splits CSV text into non-empty rows. */
function splitCsvRows(csv: string): string[] {
  return csv.split("\n").filter((row) => row.length > 0);
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
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null);
  const [pendingSettlementIds, setPendingSettlementIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [exporting, setExporting] = useState(false);
  const { notify, notifyError } = useToast();
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

  // If the URL carried an invalid pageSize (e.g. an old bookmark or a
  // hand-edited value), correct the querystring to reflect the effective page
  // size actually being used, so the address bar no longer diverges from what
  // is displayed and fetched. Writing the default value clears the param.
  useEffect(() => {
    if (String(pageSize) !== rawPageSize) {
      setRawPageSize(String(pageSize));
    }
  }, [pageSize, rawPageSize, setRawPageSize]);

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
        const message = apiErrorMessage(err);
        if (message === null) return;
        setState({
          status: "error",
          message,
        });
      });
    return () => controller.abort();
  }, [nonce, pageSize]);

  const { state: poolsState, refresh: refreshPools } = useAsync(fetchPools);

  const availableLiquidity = useMemo(() => {
    if (poolsState.status !== "ready") return undefined;
    return poolsState.data.reduce((acc, pool) => {
      acc[pool.asset] = pool.total;
      return acc;
    }, {} as Record<string, number>);
  }, [poolsState]);

  /** Switches the page size and reloads from page 1. */
  function changePageSize(size: number) {
    setRawPageSize(String(size));
  }

  async function loadMore() {
    if (loadingMore) return;
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
      setMoreError(apiErrorMessage(err, "Failed to load more settlements."));
    } finally {
      setLoadingMore(false);
    }
  }

  async function runSettlementAction(
    id: number,
    action: () => Promise<Settlement>,
    optimisticStatus: Settlement["status"],
    successMessage: string,
  ) {
    setPendingSettlementIds((prev) => new Set(prev).add(id));
    
    let previousSettlement: Settlement | undefined;
    setState((previous) => {
      if (previous.status !== "ready") return previous;
      previousSettlement = previous.settlements.find((s) => s.id === id);
      return {
        ...previous,
        settlements: previous.settlements.map((s) =>
          s.id === id ? { ...s, status: optimisticStatus } : s
        ),
      };
    });

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
      // Silently refresh pools after execute and cancel.
      // Cancel releases reserved liquidity; execute is refreshed defensively
      // (believed to not change liquidity based on UI copy, not verified
      // against backend behavior).
      void refreshPools().catch(() => {});
    } catch (err: unknown) {
      if (previousSettlement) {
        const rollbackSettlement = previousSettlement;
        setState((previous) =>
          previous.status === "ready"
            ? {
                ...previous,
                settlements: previous.settlements.map((s) =>
                  s.id === id ? rollbackSettlement : s
                ),
              }
            : previous,
        );
      }
      notifyError(err);
    } finally {
      setPendingSettlementIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
      // Silently refresh pools in the background so availableLiquidity
      // stays current after reserving liquidity.
      void refreshPools().catch(() => {});
      return true;
    } catch (err: unknown) {
      notifyError(err);
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const loadedPages =
        state.status === "ready" ? state.pagination.page : 1;
      const pages: string[] = [];
      for (let p = 1; p <= loadedPages; p++) {
        pages.push(
          await exportSettlementsCsv({ page: p, pageSize }),
        );
      }
      // The first page includes the CSV header; subsequent pages repeat it.
      // Strip the header from all pages after the first before joining.
      const [header, ...firstRows] = splitCsvRows(pages[0]);
      const rows = [...firstRows];
      for (let i = 1; i < pages.length; i++) {
        const [, ...pageRows] = splitCsvRows(pages[i]);
        rows.push(...pageRows);
      }
      const csvText = [header, ...rows].join("\n");
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
      notifyError(err, "Failed to export CSV.");
    } finally {
      setExporting(false);
    }
  }

  // Debounce only the value that drives filtering so large settlement lists
  // aren't re-filtered on every keystroke; the input stays bound to `query`.
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const visibleSettlements =
    state.status === "ready"
      ? state.settlements.filter((s) =>
          matchesQuery([s.id, s.anchor, s.asset, s.status], debouncedQuery),
        )
      : [];

  // Determine count to display in the footer
  const displayCount =
    state.status === "ready"
      ? query.trim()
        ? visibleSettlements.length
        : state.pagination.total
      : 0;

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
                    id,
                    () => executeSettlement(id),
                    "executed",
                    `Executed settlement #${id}.`,
                  )
                }
                onCancel={setPendingCancelId}
                pendingIds={pendingSettlementIds}
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
                Showing all {pluralize(displayCount, "settlement")}
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
              id,
              () => cancelSettlement(id),
              "cancelled",
              `Cancelled settlement #${id}.`,
            );
          }
        }}
      />
    </div>
  );
}
