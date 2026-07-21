"use client";

import { useEffect, useRef } from "react";
import {
  markConfirmDialogClosed,
  markConfirmDialogOpen,
} from "./confirmDialogOpenState";

/** A modal dialog gating a destructive action behind an explicit confirm step. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture the currently focused element when dialog opens
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      markConfirmDialogOpen();
    } else {
      markConfirmDialogClosed();
    }
  }, [open]);

  // Focus management
  useEffect(() => {
    if (!open) {
      // Restore focus to the original trigger when dialog closes
      if (triggerRef.current && document.body.contains(triggerRef.current)) {
        triggerRef.current.focus();
      }
      return;
    }

    // Focus cancel button on open (safer default)
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key === "Tab") {
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-sm font-semibold text-zinc-100"
        >
          {title}
        </h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm text-zinc-400">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onCancel();
              }
            }}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onConfirm();
              }
            }}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
