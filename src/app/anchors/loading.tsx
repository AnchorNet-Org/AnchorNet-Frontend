import { SiteHeader } from "@/components/SiteHeader";
import { TableSkeleton } from "@/components/TableSkeleton";

export default function AnchorsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-6 py-12">
        <TableSkeleton columns={3} />
      </main>
    </div>
  );
}
