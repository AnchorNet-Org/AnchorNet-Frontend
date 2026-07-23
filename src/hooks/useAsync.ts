"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "@/lib/api";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; message: string; error?: unknown }
  | { status: "ready"; data: T };

/**
 * Runs an abortable async loader on mount and exposes a `reload` trigger.
 *
 * If seeded with an already-"ready" `initialState`, the initial fetch on mount
 * is skipped; re-running is driven by `reload` or `refresh`.
 *
 * The loader is expected to be behaviourally stable; re-running is driven by
 * `reload`, which also surfaces a loading state.
 */
export function useAsync<T>(
  load: (signal: AbortSignal) => Promise<T>,
  initialState: AsyncState<T> = { status: "loading" },
): {
  state: AsyncState<T>;
  reload: () => void;
  /** Re-fetches; resolves when the triggered fetch settles (never rejects). */
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<AsyncState<T>>(initialState);
  const [nonce, setNonce] = useState(0);
  const refreshWaiters = useRef<Array<() => void>>([]);

  // `reload` re-fetches and shows a loading state; `refresh` re-fetches
  // silently, keeping the current data visible until the new data arrives.
  const reload = useCallback(() => {
    setState({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);
  const refresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        refreshWaiters.current.push(resolve);
        setNonce((n) => n + 1);
      }),
    [],
  );

  useEffect(() => {
    if (nonce === 0 && initialState.status === "ready") {
      return;
    }

    const controller = new AbortController();
    load(controller.signal)
      .then((data) => setState({ status: "ready", data }))
      .catch((err: unknown) => {
        // Swallow deliberate cancellations: either the controller we own was
        // aborted (unmount / reload) or the load function itself threw an
        // AbortError (e.g. from an externally-supplied signal).  Neither case
        // is a genuine failure, so we must never surface an error toast.
        // Explicitly also check for plain `Error` instances with the name
        // `AbortError` to cover racey paths where the signal's `aborted`
        // property might still be false when the catch handler runs.
        if (
          controller.signal.aborted ||
          isAbortError(err) ||
          (err instanceof Error && err.name === "AbortError")
        )
          return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Request failed",
          error: err,
        });
      })
      .finally(() => {
        // An aborted fetch was superseded by a newer one (or unmounted); its
        // waiters stay queued until the fetch that actually settles resolves
        // them all.
        if (controller.signal.aborted) return;
        refreshWaiters.current.splice(0).forEach((resolve) => resolve());
      });
    return () => controller.abort();
    // `load` is intentionally excluded; re-runs are driven by `reload`/`nonce`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return { state, reload, refresh };
}
