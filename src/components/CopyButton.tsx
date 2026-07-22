"use client";

import { useEffect, useRef, useState } from "react";

const RESET_DELAY_MS = 1500;

/** Small button that copies `text` to the clipboard, with brief "Copied" feedback. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, RESET_DELAY_MS);
    } catch {
      // Clipboard access can be denied by the browser; failing silently is
      // preferable to surfacing a toast for a non-critical convenience action.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="rounded-md px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-200"
        aria-label={copied ? "Copied" : label}
      >
        {copied ? "Copied" : label}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </>
  );
}
