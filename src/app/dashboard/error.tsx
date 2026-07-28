"use client";

import { PageShell } from "@/components/PageShell";
import { RouteError } from "@/components/RouteError";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell maxWidth="max-w-5xl">
        <RouteError
          error={error}
          reset={reset}
          title="Could not load the dashboard"
        />
    </PageShell>
  );
}
