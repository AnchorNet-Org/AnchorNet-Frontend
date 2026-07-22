import { Pool } from "@/lib/types";
import { formatAmount } from "@/lib/format";

/** Colors cycled across assets in the distribution bar and legend. */
const BAR_COLORS = [
  "#34d399", // emerald-400
  "#38bdf8", // sky-400
  "#a78bfa", // violet-400
  "#fbbf24", // amber-400
  "#f472b6", // pink-400
  "#94a3b8", // slate-400
];

function getColor(index: number, asset: string): string {
  if (index < BAR_COLORS.length) {
    return BAR_COLORS[index];
  }
  // Deterministic hue rotation for additional assets so no collision.
  let hash = 0;
  for (let i = 0; i < asset.length; i++) {
    hash = asset.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

/** Sums the `total` of every pool before `index`, as a percentage of `total`. */
function shareBefore(pools: Pool[], index: number, total: number): number {
  const before = pools.slice(0, index).reduce((sum, p) => sum + p.total, 0);
  return (before / total) * 100;
}

/**
 * A hand-rolled inline-SVG stacked bar showing each pool's share of total
 * liquidity, with a colour-keyed legend. No charting library required.
 */
export function PoolDistributionBar({ pools }: { pools: Pool[] }) {
  const total = pools.reduce((sum, p) => sum + p.total, 0);

  // Empty state: no pools or zero total liquidity. Render a visible
  // placeholder instead of a zero-width (NaN) bar so the UI never shows
  // a broken/distorted segment at zero liquidity.
  if (pools.length === 0 || total <= 0) {
    return (
      <div
        role="img"
        aria-label="No pool liquidity yet"
        className="flex h-3 w-full items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-500"
      >
        No liquidity
      </div>
    );
  }

  const segments = pools.map((pool, i) => ({
    pool,
    pct: (pool.total / total) * 100,
    x: shareBefore(pools, i, total),
    color: getColor(i, pool.asset),
  }));

  return (
    <div>
      <svg
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        className="h-3 w-full overflow-hidden rounded-full"
        role="img"
        aria-label="Pool liquidity distribution by asset"
      >
        {segments.map(({ pool, pct, x, color }) => (
          <rect
            key={pool.asset}
            x={x}
            y={0}
            width={pct}
            height={8}
            fill={color}
          >
            <title>
              {`${pool.asset}: ${formatAmount(pool.total)} (${pct.toFixed(1)}%)`}
            </title>
          </rect>
        ))}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        {segments.map(({ pool, pct, color }) => (
          <li key={pool.asset} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            {pool.asset} · {pct.toFixed(1)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
