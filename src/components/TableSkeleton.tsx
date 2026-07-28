/** Animated placeholder rows shown while a table's data is loading. */
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div
      className="animate-pulse motion-reduce:animate-none"
      role="status"
      aria-label="Loading table data"
    >
      <div className="mb-3 flex gap-4 border-b border-zinc-800 pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-zinc-800" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex gap-4 border-b border-zinc-900 py-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, col) => (
            <div key={col} className="h-3 flex-1 rounded bg-zinc-900" />
          ))}
        </div>
      ))}
    </div>
  );
}
