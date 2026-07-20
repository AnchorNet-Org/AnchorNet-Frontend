"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errorReporter";

export function GlobalErrorHandler() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      reportError(error, { route: window.location.pathname });
    };

    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return null;
}
