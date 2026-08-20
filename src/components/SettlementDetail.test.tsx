import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SettlementDetail } from "./SettlementDetail";
import { executeSettlement } from "@/lib/settlementsApi";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { ApiRequestError } from "@/lib/api";
import { Settlement } from "@/lib/types";

vi.mock("@/lib/settlementsApi", () => ({
  fetchSettlement: vi.fn(),
  executeSettlement: vi.fn(),
  cancelSettlement: vi.fn(),
}));

vi.mock("@/hooks/useAsync", () => ({ useAsync: vi.fn() }));
vi.mock("@/hooks/useToast", () => ({ useToast: vi.fn() }));

const settlement: Settlement = {
  id: 7,
  anchor: "stellar-anchor",
  asset: "USDC",
  amount: 100,
  fee: 1,
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("SettlementDetail API error classification", () => {
  const notify = vi.fn();
  const notifyError = vi.fn();
  const mutate = vi.fn();
  const refresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({
      toasts: [],
      notify,
      notifyError,
      dismiss: vi.fn(),
    });
    vi.mocked(useAsync).mockReturnValue({
      state: { status: "ready", data: settlement },
      reload: vi.fn(),
      refresh,
      mutate,
    });
  });

  it("routes a failed mutation through notifyError and restores optimistic state", async () => {
    const failure = new ApiRequestError(undefined, "TIMEOUT", "internal", undefined, {
      kind: "timeout",
    });
    vi.mocked(executeSettlement).mockRejectedValue(failure);

    render(<SettlementDetail id={settlement.id} initialData={settlement} />);
    fireEvent.click(screen.getByRole("button", { name: "Execute" }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(failure));
    expect(mutate).toHaveBeenLastCalledWith({
      status: "ready",
      data: settlement,
    });
    expect(notify).not.toHaveBeenCalledWith("error", expect.anything());
  });
});
