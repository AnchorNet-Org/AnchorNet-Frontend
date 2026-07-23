import { Card } from "./Card";

/** A single labelled metric shown in the dashboard summary row. */
export function StatCard({
  label,
  value,
  hint,
  loading
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  if(loading){
    return (
      <Card >
        {/* <div className="animate-pulse">
          <div className="h-3 w-20 rounded bg-zinc-800" />
          <div className="mt-3 h-7 w-16 rounded bg-zinc-700" />
          <div className="mt-2 h-3 w-12 rounded bg-zinc-800" />
        </div> */}
        <p className="text-sm text-zinc-400">{label}</p>
        <div className="animate-pulse">
          <div className="mt-3 h-7 w-16 rounded bg-zinc-700" />
          <div className="mt-2 h-3 w-12 rounded bg-zinc-800" />
        </div>
      </Card>
    )
  }
  return (
    <Card>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}
