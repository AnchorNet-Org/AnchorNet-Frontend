"use client";

import { useCallback, useState } from "react";
import { fetchMetrics } from "@/lib/metricsApi";
import { useAsync } from "@/hooks/useAsync";
import { useInterval } from "@/hooks/useInterval";
import { formatAmount } from "@/lib/format";
import { StatCard } from "./StatCard";
import { Card } from "./Card";
import { Spinner } from "./Spinner";

/** Refresh interval for live metrics, in milliseconds. */
const REFRESH_MS = 15_000;

/**
 * Top-of-page row of aggregate network metrics, refreshed periodically.
 *
 * A manual "Refresh" button fetches immediately without resetting the
 * auto-refresh countdown; only manual refreshes show the button spinner.
 */
export function MetricsBar() {
  const load = useCallback((signal: AbortSignal) => fetchMetrics(signal), []);
  const { state, refresh } = useAsync(load);
  useInterval(refresh, REFRESH_MS);

  // Tracks user-initiated refreshes only, so the button spinner doesn't
  // flash on every silent interval tick.
  const [manualRefresh, setManualRefresh] = useState(false);
  const refreshNow = () => {
    setManualRefresh(true);
    void refresh().finally(() => setManualRefresh(false));
  };

  if (state.status === "loading") {
    return (
      <Card>
        <div className="flex items-start gap-2">
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Active anchors" value="" loading />
            <StatCard label="Pools" value="" loading />
            <StatCard label="Total liquidity" value="" loading />
            <StatCard label="Settlements" value="" loading />
          </div>

          {/* Refresh button placeholder */}
          <div className="mt-1 h-6 w-6 animate-pulse rounded-full bg-zinc-800" />
        </div>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <p className="text-sm text-red-400">
          Metrics unavailable: {state.message}
        </p>
      </Card>
    );
  }

  const m = state.data;
  return (
    <div className="flex items-start gap-2">
      <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Active anchors"
          value={`${formatAmount(m.activeAnchors)}/${formatAmount(m.anchors)}`}
        />
        <StatCard label="Pools" value={formatAmount(m.pools)} />
        <StatCard label="Total liquidity" value={formatAmount(m.totalLiquidity)} />
        <StatCard
          label="Settlements"
          value={formatAmount(m.settlements)}
          hint={`${m.pendingSettlements} pending`}
        />
      </div>
      <button
        type="button"
        onClick={refreshNow}
        disabled={manualRefresh}
        className="rounded-md px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-200"
        aria-label="Refresh metrics"
      >
        {manualRefresh ? <Spinner label="" /> : <span aria-hidden>↻</span>}
      </button>
    </div>
  );
}
