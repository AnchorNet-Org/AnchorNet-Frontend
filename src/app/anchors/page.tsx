import { Suspense } from "react";
import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { AnchorsPanel } from "@/components/AnchorsPanel";
import { TableSkeleton } from "@/components/TableSkeleton";

export const metadata: Metadata = {
  title: "Anchors – AnchorNet",
  description: "Register and manage AnchorNet liquidity anchors.",
};

export default function AnchorsPage() {
  return (
    <PageShell>
        <h1 className="text-2xl font-bold tracking-tight text-white">Anchors</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Approved anchors that provide liquidity to the network.
        </p>
        <div className="mt-8">
          {/* Suspense is required by Next.js App Router when a child client
              component reads useSearchParams() at render time. */}
          <Suspense fallback={<TableSkeleton columns={3} />}>
            <AnchorsPanel />
          </Suspense>
        </div>
    </PageShell>
  );
}
