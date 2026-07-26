import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { MetricsBar } from "@/components/MetricsBar";
import { DashboardContent } from "@/components/DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard – AnchorNet",
  description: "Live liquidity pools and routing quotes for AnchorNet anchors.",
};

export default function DashboardPage() {
  return (
    <PageShell maxWidth="max-w-5xl">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Liquidity Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Aggregated anchor liquidity and routing quotes from the AnchorNet API.
        </p>

        <div className="mt-8">
          <MetricsBar />
        </div>

        <div className="mt-6">
          <DashboardContent />
        </div>
    </PageShell>
  );
}
