import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { SettlementDetail } from "./SettlementDetail";
import { ToastProvider } from "./ToastProvider";
import { fetchSettlement, executeSettlement, cancelSettlement } from "@/lib/settlementsApi";
import { ApiRequestError } from "@/lib/api";
import { Settlement } from "@/lib/types";

vi.mock("@/lib/settlementsApi", () => ({
  fetchSettlement: vi.fn(),
  executeSettlement: vi.fn(),
  cancelSettlement: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

const pending = {
  id: 1,
  anchor: "anchorA",
  asset: "USDC",
  amount: 400,
  fee: 4,
  status: "pending" as const,
  createdAt: "",
};

function renderDetail(id = 1) {
  return render(
    <ToastProvider>
      <SettlementDetail id={id} />
    </ToastProvider>,
  );
}

describe("SettlementDetail", () => {
  it("renders the settlement's fields once loaded", async () => {
    vi.mocked(fetchSettlement).mockResolvedValue(pending);

    renderDetail();

    expect(await screen.findByText("Settlement #1")).toBeInTheDocument();
    expect(screen.getByText("anchorA")).toBeInTheDocument();
    expect(screen.getByText("USDC")).toBeInTheDocument();
  });

  it("copies the anchor address to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.mocked(fetchSettlement).mockResolvedValue(pending);

    renderDetail();
    await screen.findByText("Settlement #1");

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("anchorA"));
    vi.unstubAllGlobals();
  });

  it("shows a not‑found message when the settlement returns 404", async () => {
    vi.mocked(fetchSettlement).mockRejectedValue(new ApiRequestError(404, "NOT_FOUND", "Not found"));

    renderDetail();

    // Expect the distinct not‑found text
    expect(await screen.findByText(/settlement not found/i)).toBeInTheDocument();
  });


  it("hides execute/cancel actions for a non-pending settlement", async () => {
    vi.mocked(fetchSettlement).mockResolvedValue({
      ...pending,
      status: "executed",
    });

    renderDetail();
    await screen.findByText("Settlement #1");

    expect(
      screen.queryByRole("button", { name: "Execute" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the badge mounted and announces the refreshed status after execution", async () => {
    let resolveRefresh!: (settlement: Settlement) => void;
    vi.mocked(fetchSettlement)
      .mockResolvedValueOnce(pending)
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveRefresh = resolve)),
      );
    vi.mocked(executeSettlement).mockResolvedValue({
      ...pending,
      status: "executed",
    });

    renderDetail();
    await screen.findByText("Settlement #1");

    const visibleBadge = screen.getByText("Pending");
    const liveRegion = visibleBadge.nextElementSibling as HTMLElement;
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "Execute" }));

    await waitFor(() => expect(executeSettlement).toHaveBeenCalledWith(1));
    await waitFor(() => expect(fetchSettlement).toHaveBeenCalledTimes(2));

    expect(
      screen.queryByLabelText("Loading settlement…"),
    ).not.toBeInTheDocument();
    expect(visibleBadge).toBeInTheDocument();
    expect(liveRegion).toBeInTheDocument();

    await act(async () => {
      resolveRefresh({ ...pending, status: "executed" });
    });

    expect(visibleBadge).toHaveTextContent("Executed");
    expect(liveRegion).toHaveTextContent("Executed");
    expect(screen.getByText("Executed settlement #1.")).toBeInTheDocument();
  });

  it("disables Execute and Cancel while settlement action is pending", async () => {
    vi.mocked(fetchSettlement).mockResolvedValue(pending);
    let resolveAction: () => void;
    const pendingPromise = new Promise<void>((res) => {
      resolveAction = res;
    });
    vi.mocked(executeSettlement).mockReturnValue(pendingPromise as any);

    renderDetail();
    await screen.findByText("Settlement #1");
    const executeBtn = screen.getByRole("button", { name: "Execute" });
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    expect(executeBtn).not.toBeDisabled();
    expect(cancelBtn).not.toBeDisabled();

    fireEvent.click(executeBtn);
    expect(executeBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    // resolve the promise to simulate completion
    resolveAction!();
    await waitFor(() => expect(executeBtn).not.toBeDisabled());
    expect(cancelBtn).not.toBeDisabled();
  });

  it("cancels cancellation when Keep settlement is clicked in the confirm dialog", async () => {
    vi.mocked(fetchSettlement).mockResolvedValue(pending);

    renderDetail();
    await screen.findByText("Settlement #1");

    // Click "Cancel" to open the dialog
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelSettlement).not.toHaveBeenCalled();

    // Dialog should be open
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    // Click the "Keep settlement" button in the dialog
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep settlement" }));

    // Verify cancelSettlement was not called
    expect(cancelSettlement).not.toHaveBeenCalled();

    // Dialog should be closed
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Settlement status is unchanged (remains Pending)
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("confirms before cancelling a pending settlement", async () => {
    vi.mocked(fetchSettlement).mockResolvedValue(pending);
    vi.mocked(cancelSettlement).mockResolvedValue({
      ...pending,
      status: "cancelled",
    });

    renderDetail();
    await screen.findByText("Settlement #1");

    // Click "Cancel" to open the dialog
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelSettlement).not.toHaveBeenCalled();

    // Dialog should be open
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    // Click the "Cancel settlement" button in the dialog to confirm
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel settlement" }));

    // Verify cancelSettlement was called
    await waitFor(() =>
      expect(cancelSettlement).toHaveBeenCalledWith(1),
    );
  });

});
