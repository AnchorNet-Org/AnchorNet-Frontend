import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { SettlementsPanel } from "@/components/SettlementsPanel";
import { TableSkeleton } from "@/components/TableSkeleton";

export const metadata: Metadata = {
  title: "Settlements – AnchorNet",
  description: "Open and manage cross-anchor settlements.",
};

export default function SettlementsPage() {
  return (
    <PageShell>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Settlements
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Reserve pool liquidity to settle cross-anchor payments.
        </p>
        <div className="mt-8">
          {/* Suspense is required by Next.js App Router when a child client
              component reads useSearchParams() at render time. */}
          <Suspense fallback={<TableSkeleton columns={6} />}>
            <SettlementsPanel />
          </Suspense>
        </div>
    </PageShell>
  );
}
