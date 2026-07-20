import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "@/hooks/useToast";
import { MAX_TOASTS } from "@/lib/toast";

/** Fires a single notification on mount via the real toast context. */
function Trigger({
  message = "Saved successfully",
  kind = "success",
}: {
  message?: string;
  kind?: "success" | "error";
}) {
  const { notify } = useToast();
  useEffect(() => {
    notify(kind, message);
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

  it("renders an error toast and keeps it on screen until its timer elapses", () => {
    render(
      <ToastProvider>
        <Trigger kind="error" message="Settlement failed" />
      </ToastProvider>,
    );

    expect(screen.getByText("Settlement failed")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(screen.getByText("Settlement failed")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText("Settlement failed")).not.toBeInTheDocument();
  });

  it("does not auto-dismiss while hovered and resumes the remaining time on mouse-leave", () => {
    render(
      <ToastProvider>
        <Trigger message="Hold please" />
      </ToastProvider>,
    );
    const toast = screen.getByText("Hold please");
    const region = screen.getByRole("status");

    // Let 3s of the 5s duration elapse while visible.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(toast).toBeInTheDocument();

    // Hovering pauses the countdown for good.
    fireEvent.mouseEnter(region);
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(toast).toBeInTheDocument();

    // Un-hovering must resume from the ~2s remaining, not a full 5s restart
    // and not an immediate dismiss.
    fireEvent.mouseLeave(region);

    // Still visible well inside the remaining window (not immediate).
    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(toast).toBeInTheDocument();

    // Dismisses right at the remaining window (~2s after un-hover), well
    // before a full 5s restart would (which would need ~8s since hover).
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(toast).not.toBeInTheDocument();
  });

  it("pauses the dismiss timer on focus and resumes from remaining time on blur", () => {
    render(
      <ToastProvider>
        <Trigger message="Review required" />
      </ToastProvider>,
    );
    const toast = screen.getByText("Review required");
    const region = screen.getByRole("status");

    // 2s of the 5s duration elapse.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(toast).toBeInTheDocument();

    // Focusing (keyboard users) pauses the countdown.
    fireEvent.focus(region);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(toast).toBeInTheDocument();

    // Blurring resumes from the remaining ~3s, not a full restart.
    fireEvent.blur(region);

    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(toast).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(toast).not.toBeInTheDocument();
  });

  it("treats a second pause while already paused as a no-op (no double counting)", () => {
    render(
      <ToastProvider>
        <Trigger message="Almost gone" />
      </ToastProvider>,
    );
    const toast = screen.getByText("Almost gone");
    const region = screen.getByRole("status");

    // 2s elapse, then pause.
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.mouseEnter(region);
    // Pause again immediately without un-hovering: must not subtract more time.
    fireEvent.mouseEnter(region);

    fireEvent.mouseLeave(region);
    // Resuming from the full remaining 3s, not less (guard prevented over-subtraction).
    act(() => {
      vi.advanceTimersByTime(2900);
    });
    expect(toast).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(toast).not.toBeInTheDocument();
  });
});
