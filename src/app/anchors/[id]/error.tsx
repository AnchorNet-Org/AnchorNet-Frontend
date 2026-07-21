"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { RouteError } from "@/components/RouteError";

export default function AnchorDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-6 py-12">
        <RouteError
          error={error}
          reset={reset}
          title="Could not load this anchor"
        />
      </main>
    </div>
  );
}
