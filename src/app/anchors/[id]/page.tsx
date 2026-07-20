import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { AnchorDetail } from "@/components/AnchorDetail";
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Anchor detail
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Full record for a single registered anchor.
        </p>
        <div className="mt-8">
          <AnchorDetail id={decodedId} initialData={anchor} />
        </div>
      </main>
    </div>
  );
}
