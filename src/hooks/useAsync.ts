"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/**
 * Runs an abortable async loader on mount and exposes a `reload` trigger.
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
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => setState({ status: "ready", data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Request failed",
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
