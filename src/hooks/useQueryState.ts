"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/**
 * Syncs a single URL search-param to local component state.
 *
 * Returns a `[value, setter]` tuple that behaves like `useState` but also
 * keeps the URL querystring in sync so the view can be bookmarked / shared.
 *
 * **Hydration:** the initial value is read from the URL on mount, then stored
 * in local React state so controlled inputs respond instantly.
 *
 * **URL update:** calling the setter updates local state immediately and also
 * pushes a shallow `router.replace` so the address bar and Back button work.
 *
 * **External URL changes:** an effect watches the URL search-param value so that
 * navigation changes (e.g. browser Back/Forward buttons) keep local state in sync.
 *
 * - An empty / missing param is represented as the provided `fallback`
 *   (defaults to `""`).
 * - Writing the fallback value removes the param from the URL (cleaner URLs).
 *
 * @param key      The URL search-param name (e.g. `"q"`, `"status"`).
 * @param fallback Value used when the param is absent or empty.
 */
export function useQueryState(
  key: string,
  fallback: string = "",
): [string, (value: string) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive the initial value from the URL; fall back to the provided default
  // if the param is absent or empty.
  const raw = searchParams.get(key);
  const initial = raw !== null && raw !== "" ? raw : fallback;

  // Keep local state so controlled inputs respond instantly without waiting
  // for a router round-trip.
  const [value, setValue] = useState<string>(initial);

  // Sync state when the URL param changes externally (e.g. Back/Forward navigation).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(initial);
  }, [initial]);

  const set = useCallback(
    (next: string) => {
      // Update local state immediately for a responsive UI.
      setValue(next);

      // Build a fresh URLSearchParams from the current ones so we preserve
      // any other params that may be present (future-proofing).
      const params = new URLSearchParams(searchParams.toString());
      if (next === "" || next === fallback) {
        // Remove the param when it matches the default to keep URLs clean.
        params.delete(key);
      } else {
        params.set(key, next);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [key, fallback, pathname, router, searchParams],
  );

  return [value, set];
}
