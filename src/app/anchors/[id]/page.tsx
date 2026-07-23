import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { AnchorDetail } from "@/components/AnchorDetail";
import { Breadcrumb } from "@/components/Breadcrumb";
import { fetchAnchor } from "@/lib/anchorsApi";
import { ApiRequestError } from "@/lib/api";

export const metadata: Metadata = {
  title: "Anchor detail – AnchorNet",
  description: "Full record detail for a single AnchorNet anchor.",
};

export default async function AnchorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  let anchor;
  try {
    anchor = await fetchAnchor(decodedId);
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
            { label: "Anchors", href: "/anchors" },
            { label: decodedId },
          ]}
        />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
          Anchor detail
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Full record for a single registered anchor.
        </p>
        <div className="mt-8">
          <AnchorDetail id={decodedId} initialData={anchor} />
        </div>
    </PageShell>
  );
}
