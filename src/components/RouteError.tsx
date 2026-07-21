"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { reportError } from "@/lib/errorReporter";
import { Card } from "./Card";

export function RouteError({
  error,
  reset,
  title = "Something went wrong",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  const pathname = usePathname();

  useEffect(() => {
    reportError(error, {
      route: pathname,
      requestId: (error as { requestId?: string }).requestId,
    });
  }, [error, pathname]);

  return (
    <Card>
      <h2 className="text-sm font-semibold text-red-400">{title}</h2>
      <p className="mt-2 text-sm text-zinc-400">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
      >
        Try again
      </button>
    </Card>
  );
}
