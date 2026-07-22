/** Why a list is empty: no data exists yet, or active filters matched nothing. */
export type EmptyStateReason = "no-data" | "no-results";

type EmptyStateProps = {
  message: string;
  /** Defaults to "no-data" (genuinely empty list). */
  reason?: EmptyStateReason;
  /** Shown as a "Clear filters" action when reason is "no-results". */
  onClearFilters?: () => void;
};

/** Placeholder shown when a list has no items. */
export function EmptyState({
  message,
  reason = "no-data",
  onClearFilters,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
      <p>{message}</p>
      {reason === "no-results" && onClearFilters ? (
        <button
          onClick={onClearFilters}
          className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
