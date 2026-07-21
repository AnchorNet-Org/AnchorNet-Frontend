import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { AnchorsPanel } from "@/components/AnchorsPanel";
import { TableSkeleton } from "@/components/TableSkeleton";

export const metadata: Metadata = {
  title: "Anchors â€“ AnchorNet",
  description: "Register and manage AnchorNet liquidity anchors.",
};

export default function AnchorsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-6 py-12">
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
      </main>
    </div>
  );
}
