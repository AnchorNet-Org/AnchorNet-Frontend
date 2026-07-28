import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { SettlementDetail } from "@/components/SettlementDetail";
import { Breadcrumb } from "@/components/Breadcrumb";
import { fetchSettlement } from "@/lib/settlementsApi";
import { ApiRequestError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Settlement detail – AnchorNet",
  description: "Full record detail for a single AnchorNet settlement.",
};

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    notFound();
  }

  let settlement;
  try {
    settlement = await fetchSettlement(numericId);
  } catch (error: unknown) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <PageShell>
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Settlements", href: "/settlements" },
            { label: id },
          ]}
        />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
          Settlement detail
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Full record for a single cross-anchor settlement.
        </p>
        <div className="mt-8">
          <SettlementDetail id={numericId} initialData={settlement} />
        </div>
    </PageShell>
  );
}
