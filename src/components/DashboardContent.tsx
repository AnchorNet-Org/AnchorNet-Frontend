"use client";

import { useCallback } from "react";
import { fetchPools } from "@/lib/api";
import { Pool } from "@/lib/types";
import { useAsync } from "@/hooks/useAsync";
import { PoolsPanel } from "./PoolsPanel";
import { QuoteForm } from "./QuoteForm";

/**
 * Client wrapper that fetches pools once and shares the data between
 * PoolsPanel and QuoteForm to avoid redundant network requests.
 */
export function DashboardContent() {
  const load = useCallback((signal: AbortSignal) => fetchPools(signal), []);
  const { state, reload } = useAsync<Pool[]>(load);

  const pools = state.status === "ready" ? state.data : [];
  const assetCodes = pools.map((pool) => pool.asset);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <PoolsPanel pools={pools} isLoading={state.status === "loading"} error={state.status === "error" ? state.message : undefined} onReload={reload} />
      </div>
      <div>
        <QuoteForm knownAssets={assetCodes} />
      </div>
    </div>
  );
}
