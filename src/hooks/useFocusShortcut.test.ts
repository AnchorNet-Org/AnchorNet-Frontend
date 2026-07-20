import { describe, it, expect, afterEach } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import { createElement, createRef } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { resetConfirmDialogOpenState } from "@/components/confirmDialogOpenState";
import { useFocusShortcut } from "./useFocusShortcut";

function pressKey(key: string, target: EventTarget = document.body) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true });
  target.dispatchEvent(event);
}

afterEach(() => {
  resetConfirmDialogOpenState();
});

describe("useFocusShortcut", () => {
  it("focuses the target element when the key is pressed", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const ref = createRef<HTMLInputElement>();
    ref.current = input;

    renderHook(() => useFocusShortcut("/", ref));
    pressKey("/");

    expect(document.activeElement).toBe(input);
    document.body.removeChild(input);
  });

  it("does not steal focus when already typing in a text input", () => {
    const searchInput = document.createElement("input");
    const otherInput = document.createElement("input");
    document.body.appendChild(searchInput);
    document.body.appendChild(otherInput);
    otherInput.focus();
    const ref = createRef<HTMLInputElement>();
    ref.current = searchInput;

    renderHook(() => useFocusShortcut("/", ref));
    pressKey("/", otherInput);

    expect(document.activeElement).toBe(otherInput);
    document.body.removeChild(searchInput);
    document.body.removeChild(otherInput);
  });

  it("removes its listener on unmount", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    const ref = createRef<HTMLInputElement>();
    ref.current = input;

    const { unmount } = renderHook(() => useFocusShortcut("/", ref));
    unmount();
    pressKey("/");

    expect(document.activeElement).not.toBe(input);
  });

  it("does nothing while a confirm dialog is open, then works again after it closes", () => {
    const searchInput = document.createElement("input");
    const outsideButton = document.createElement("button");
    document.body.appendChild(searchInput);
    document.body.appendChild(outsideButton);
    outsideButton.focus();

    const ref = createRef<HTMLInputElement>();
    ref.current = searchInput;

    renderHook(() => useFocusShortcut("/", ref));
    const dialog = render(
      createElement(ConfirmDialog, {
        open: true,
        title: "Delete anchor",
        message: "Are you sure?",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );

    pressKey("/");
    expect(document.activeElement).toBe(screen.getByText("Cancel"));

    dialog.rerender(
      createElement(ConfirmDialog, {
        open: false,
        title: "Delete anchor",
        message: "Are you sure?",
        onConfirm: () => {},
        onCancel: () => {},
      }),
    );

    outsideButton.focus();
    pressKey("/");
    expect(document.activeElement).toBe(searchInput);

    document.body.removeChild(searchInput);
    document.body.removeChild(outsideButton);
  });
});
