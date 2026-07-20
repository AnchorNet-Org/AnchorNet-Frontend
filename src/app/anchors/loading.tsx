import { SiteHeader } from "@/components/SiteHeader";
import { Spinner } from "@/components/Spinner";

export default function AnchorsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-6 py-12">
        <Spinner label="Loading anchorsâ€¦" />
      </main>
    </div>
  );
}
