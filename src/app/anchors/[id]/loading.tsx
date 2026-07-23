import Link from "next/link";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/PageShell";

export default function AnchorDetailLoading() {
  return (
    <PageShell>
        <div className="space-y-6">
          <Link
            href="/anchors"
            className="text-sm text-zinc-400 hover:text-zinc-100"
          >
            ← Back to anchors
          </Link>
          <Card>
            <div
              role="status"
              aria-label="Loading anchor detail"
              className="space-y-4"
            >
              <div className="space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-56 animate-pulse rounded bg-zinc-800/80" />
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
                  <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
                  <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
                </div>
              </dl>
              <div className="h-8 w-24 animate-pulse rounded-lg bg-zinc-800" />
            </div>
          </Card>
        </div>
    </PageShell>
  );
}
