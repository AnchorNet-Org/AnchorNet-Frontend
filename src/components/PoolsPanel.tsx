"use client";

import { useCallback, useMemo, useRef } from "react";
import { fetchPools } from "@/lib/api";
import { Pool } from "@/lib/types";
import { formatAmount } from "@/lib/format";
import { matchesQuery } from "@/lib/search";
import { useAsync } from "@/hooks/useAsync";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFocusShortcut } from "@/hooks/useFocusShortcut";
import { useQueryState } from "@/hooks/useQueryState";
import { Card } from "./Card";
import { StatCard } from "./StatCard";
import { PoolTable } from "./PoolTable";
import { PoolDistributionBar } from "./PoolDistributionBar";
import { TableSkeleton } from "./TableSkeleton";
import { EmptyState } from "./EmptyState";

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Optional props allowing a parent (e.g. DashboardContent) to supply pool data
 * it already fetched, avoiding a duplicate request. When omitted, the panel
 * fetches its own data.
 */
export interface PoolsPanelProps {
  pools?: Pool[];
  isLoading?: boolean;
  error?: string;
  onReload?: () => void;
}

/** Client panel that loads liquidity pools and renders summary stats. */
export function PoolsPanel({
  pools: externalPools,
  isLoading,
  error,
  onReload,
}: PoolsPanelProps = {}) {
  const load = useCallback((signal: AbortSignal) => fetchPools(signal), []);
  const initialState:
    | { status: "ready"; data: Pool[] }
    | { status: "loading" } =
    externalPools !== undefined
      ? { status: "ready", data: externalPools }
      : { status: "loading" };
  const { state, reload: internalReload } = useAsync<Pool[]>(
    load,
    initialState,
  );
  const [query, setQuery] = useQueryState("q", "");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const searchRef = useRef<HTMLInputElement>(null);
  useFocusShortcut("/", searchRef);

  // Use external data if provided, otherwise use internal fetch state
  const pools =
    externalPools !== undefined
      ? externalPools
      : state.status === "ready"
        ? state.data
        : [];
  const loadingState =
    isLoading !== undefined ? isLoading : state.status === "loading";
  const errorState =
    error !== undefined
      ? error
      : state.status === "error"
        ? state.message
        : undefined;
  const reload = onReload !== undefined ? onReload : internalReload;

  // Hooks must run unconditionally on every render, so these are computed
  // here (before the early loading/error returns below) rather than after.
  const totalLiquidity = useMemo(
    () => pools.reduce((sum, p) => sum + p.total, 0),
    [pools],
  );
  const positions = useMemo(
    () => pools.reduce((sum, p) => sum + p.anchors, 0),
    [pools],
  );
  const filteredPools = useMemo(
    () => pools.filter((pool) => matchesQuery([pool.asset], debouncedQuery)),
    [pools, debouncedQuery],
  );

  if (loadingState) {
    return (
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Pools</h2>
        <TableSkeleton columns={3} />
      </Card>
    );
  }

  if (errorState) {
    return (
      <Card>
        <p className="text-sm text-red-400">
          Could not reach the API: {errorState}
        </p>
        <button
          onClick={reload}
          className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
        >
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Assets" value={String(pools.length)} />
        <StatCard
          label="Total liquidity"
          value={formatAmount(totalLiquidity)}
        />
        <StatCard
          label="Anchor positions"
          value={formatAmount(positions)}
          hint="across all assets"
        />
      </div>
      <Card>
        <div className="mb-4">
          <PoolDistributionBar pools={pools} />
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Pools</h2>
          <div className="flex items-center gap-2">
            {pools.length > 0 && (
              <div
                role="search"
                aria-label="Pools search"
                className="flex items-center gap-2"
              >
                <input
                  ref={searchRef}
                  type="text"
                  aria-label="Search pools"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pools… (/)"
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
              </div>
            )}
            <button
              onClick={reload}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
            >
              Refresh
            </button>
          </div>
        </div>
        {filteredPools.length === 0 && pools.length > 0 ? (
          <EmptyState
            reason="no-results"
            message="No pools match your search."
            onClearFilters={() => setQuery("")}
          />
        ) : (
          <PoolTable pools={filteredPools} />
        )}
      </Card>
    </div>
  );
}
