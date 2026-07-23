/** A small inline loading indicator with an optional label. */
export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <span
        aria-hidden
        className="h-3 w-3 animate-spin motion-reduce:animate-none rounded-full border-2 border-zinc-600 border-t-zinc-200"
      />
      {label}
    </div>
  );
}
