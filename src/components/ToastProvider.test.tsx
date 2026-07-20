import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "@/hooks/useToast";
import { MAX_TOASTS } from "@/lib/toast";

/** Fires a single notification on mount via the real toast context. */
function Trigger({ message = "Saved successfully" }: { message?: string }) {
  const { notify } = useToast();
  useEffect(() => {
    notify("success", message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Fires `count` notifications on mount, to simulate a burst of quick actions. */
function BurstTrigger({ count }: { count: number }) {
  const { notify } = useToast();
  useEffect(() => {
    for (let i = 1; i <= count; i += 1) {
      notify("success", `Message ${i}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-dismisses a toast after 5 seconds", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    expect(screen.getByText("Saved successfully")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();
  });

  it("does not auto-dismiss before the timeout elapses", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
  });

  it("renders a queued toast notification", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
  });

  it("dismisses a toast when its close button is clicked", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByLabelText("Dismiss notification"));

    expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();
  });

  it("keeps the toast context stable for useToast consumers", () => {
    render(
      <ToastProvider>
        <Trigger message="Registered anchor" />
      </ToastProvider>,
    );

    expect(screen.getByText("Registered anchor")).toBeInTheDocument();
  });

  it("shows a '+N more' indicator when a burst exceeds the cap", () => {
    render(
      <ToastProvider>
        <BurstTrigger count={MAX_TOASTS + 2} />
      </ToastProvider>,
    );

    // The two oldest toasts were bumped off the stack.
    expect(screen.queryByText("Message 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Message 2")).not.toBeInTheDocument();
    expect(screen.getByText("Message 3")).toBeInTheDocument();
    expect(screen.getByText(`+${MAX_TOASTS + 2 - MAX_TOASTS} more`)).toBeInTheDocument();
  });

  it("does not show a dropped indicator when the burst stays within the cap", () => {
    render(
      <ToastProvider>
        <BurstTrigger count={MAX_TOASTS} />
      </ToastProvider>,
    );

    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });

  it("clears the '+N more' indicator once the stack drops back under the cap", () => {
    render(
      <ToastProvider>
        <BurstTrigger count={MAX_TOASTS + 2} />
      </ToastProvider>,
    );

    expect(screen.getByText("+2 more")).toBeInTheDocument();

    // Dismissing a single toast brings the stack from MAX_TOASTS to
    // MAX_TOASTS - 1, i.e. back under the cap, even though toasts remain.
    fireEvent.click(screen.getAllByLabelText("Dismiss notification")[0]);

    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });

  it("keeps unrelated toast/dismiss behaviour unchanged during a burst", () => {
    render(
      <ToastProvider>
        <BurstTrigger count={MAX_TOASTS + 2} />
      </ToastProvider>,
    );

    expect(screen.getAllByLabelText("Dismiss notification")).toHaveLength(
      MAX_TOASTS,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Message 5")).not.toBeInTheDocument();
    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });
});
