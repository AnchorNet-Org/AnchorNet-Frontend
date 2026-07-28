"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/errorReporter";

export function GlobalErrorHandler() {
  useEffect(() => {
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      reportError(error, { route: window.location.pathname });
    };

    const errorHandler = (event: ErrorEvent) => {
      // Intentionally not calling event.preventDefault() here so the browser
      // can still log the error to the console natively, whereas unhandled
      // promise rejections (above) prevent default to suppress redundant logs.
      const error = event.error instanceof Error
        ? event.error
        : new Error(event.message || "Unknown error");
      reportError(error, { route: window.location.pathname });
    };

    window.addEventListener("unhandledrejection", rejectionHandler);
    window.addEventListener("error", errorHandler);

    return () => {
      window.removeEventListener("unhandledrejection", rejectionHandler);
      window.removeEventListener("error", errorHandler);
    };
  }, []);

  return null;
}
