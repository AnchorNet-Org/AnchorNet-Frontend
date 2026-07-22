"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates once `value` has
 * stopped changing for `delayMs`. Useful for deferring expensive derived work
 * (e.g. list filtering) while an input stays responsive to every keystroke.
 *
 * A `delayMs` of `0` (or less) updates synchronously on the next tick. The
 * pending timer is cleared on unmount and whenever `value` changes again.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
