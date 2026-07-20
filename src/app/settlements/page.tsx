import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SettlementsPanel } from "@/components/SettlementsPanel";
import { TableSkeleton } from "@/components/TableSkeleton";

export const metadata: Metadata = {
  title: "Settlements â€“ AnchorNet",
  description: "Open and manage cross-anchor settlements.",
};

export default function SettlementsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-6 py-12">
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
      </main>
    </div>
  );
}
