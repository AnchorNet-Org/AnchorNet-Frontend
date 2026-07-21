"use client";

import { RefObject, useEffect } from "react";
import { isConfirmDialogOpen } from "@/components/confirmDialogOpenState";

/**
 * Focuses `ref`'s element when `key` is pressed, unless focus is already
 * inside a text input, textarea, or contenteditable element (so typing the
 * key into another field doesn't hijack focus).
 *
 * Note: If multiple components bind the same key simultaneously, they will all
 * attempt to focus their respective refs in the order they were mounted. 
 * Because focus is exclusive, the last mounted instance will retain focus.
 */
export function useFocusShortcut(
  key: string,
  ref: RefObject<HTMLInputElement | null>,
): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== key) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      if (isConfirmDialogOpen()) {
        return;
      }

      event.preventDefault();
      ref.current?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, ref]);
}
