"use client";

import { PageShell } from "@/components/PageShell";
import { RouteError } from "@/components/RouteError";

export default function SettlementsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell>
        <RouteError
          error={error}
          reset={reset}
          title="Could not load settlements"
        />
    </PageShell>
  );
}
