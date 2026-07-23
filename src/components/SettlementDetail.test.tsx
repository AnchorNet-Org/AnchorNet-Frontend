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
    const backLink = screen.getByRole('link', { name: /back to settlements/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/settlements');
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

  it("confirms before cancelling a pending settlement", async () => {
    vi.mocked(fetchSettlement).mockResolvedValue(pending);
    vi.mocked(cancelSettlement).mockResolvedValue({
      ...pending,
      status: "cancelled",
    });

    renderDetail();
    await screen.findByText("Settlement #1");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelSettlement).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancel settlement" }),
    );

    await waitFor(() => expect(cancelSettlement).toHaveBeenCalledWith(1));
  });

  it("skips fetchSettlement on mount when initialData is provided", () => {
    render(
      <ToastProvider>
        <SettlementDetail id={1} initialData={pending} />
      </ToastProvider>,
    );

    expect(screen.getByText("Settlement #1")).toBeInTheDocument();
    expect(screen.getByText("anchorA")).toBeInTheDocument();
    expect(fetchSettlement).not.toHaveBeenCalled();
  });

  it("calls fetchSettlement when refreshing after executing a settlement initialized with initialData", async () => {
    vi.mocked(executeSettlement).mockResolvedValue({
      ...pending,
      status: "executed",
    });
    vi.mocked(fetchSettlement).mockResolvedValue({
      ...pending,
      status: "executed",
    });

    render(
      <ToastProvider>
        <SettlementDetail id={1} initialData={pending} />
      </ToastProvider>,
    );

    expect(screen.getByText("Settlement #1")).toBeInTheDocument();
    expect(fetchSettlement).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Execute" }));

    await waitFor(() => expect(executeSettlement).toHaveBeenCalledWith(1));
    await waitFor(() => expect(fetchSettlement).toHaveBeenCalledTimes(1));
  });
});
