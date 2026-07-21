import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MetricsBar } from "@/components/MetricsBar";
import { PoolsPanel } from "@/components/PoolsPanel";
import { QuoteForm } from "@/components/QuoteForm";
import { TableSkeleton } from "@/components/TableSkeleton";

export const metadata: Metadata = {
  title: "Dashboard â€“ AnchorNet",
  description: "Live liquidity pools and routing quotes for AnchorNet anchors.",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Liquidity Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Aggregated anchor liquidity and routing quotes from the AnchorNet API.
        </p>

        <div className="mt-8">
          <MetricsBar />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* PoolsPanel reads useSearchParams() to hydrate its search query. */}
            <Suspense fallback={<TableSkeleton columns={3} />}>
              <PoolsPanel />
            </Suspense>
          </div>
          <div>
            <QuoteForm />
          </div>
        </div>
      </main>
    </div>
  );
}
