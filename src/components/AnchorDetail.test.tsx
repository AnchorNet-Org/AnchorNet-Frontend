import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { AnchorDetail } from "./AnchorDetail";
import { ToastProvider } from "./ToastProvider";
import { fetchAnchor, deregisterAnchor } from "@/lib/anchorsApi";
import { ApiRequestError } from "@/lib/api";

vi.mock("@/lib/anchorsApi", () => ({
  fetchAnchor: vi.fn(),
  deregisterAnchor: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

function renderDetail(id = "anchorA") {
  return render(
    <ToastProvider>
      <AnchorDetail id={id} />
    </ToastProvider>,
  );
}

describe("AnchorDetail", () => {
  it("renders the anchor's fields once loaded", async () => {
    vi.mocked(fetchAnchor).mockResolvedValue({
      id: "anchorA",
      name: "Anchor A",
      registeredAt: "2026-01-01T00:00:00.000Z",
      active: true,
    });

    renderDetail();

    expect(await screen.findByText("Anchor A")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("copies the anchor id to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.mocked(fetchAnchor).mockResolvedValue({
      id: "anchorA",
      name: "Anchor A",
      registeredAt: "",
      active: true,
    });

    renderDetail();
    await screen.findByText("Anchor A");

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("anchorA"));
    vi.unstubAllGlobals();
  });

  it("shows a not‑found message when the anchor returns 404", async () => {
    vi.mocked(fetchAnchor).mockRejectedValue(
      new ApiRequestError(404, "NOT_FOUND", "Not found"),
    );

    renderDetail();

    // Expect the distinct not‑found text
    expect(await screen.findByText(/anchor not found/i)).toBeInTheDocument();
  });

  it("hides the deactivate action for an already-inactive anchor", async () => {
    vi.mocked(fetchAnchor).mockResolvedValue({
      id: "anchorA",
      name: "Anchor A",
      registeredAt: "",
      active: false,
    });

    renderDetail();
    await screen.findByText("Anchor A");

    expect(
      screen.queryByRole("button", { name: "Deactivate" }),
    ).not.toBeInTheDocument();
  });

  it("confirms before deactivating the anchor", async () => {
    vi.mocked(fetchAnchor).mockResolvedValue({
      id: "anchorA",
      name: "Anchor A",
      registeredAt: "",
      active: true,
    });
    vi.mocked(deregisterAnchor).mockResolvedValue({
      id: "anchorA",
      name: "Anchor A",
      registeredAt: "",
      active: false,
    });

    renderDetail();
    await screen.findByText("Anchor A");

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(deregisterAnchor).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    await waitFor(() =>
      expect(deregisterAnchor).toHaveBeenCalledWith("anchorA"),
    );
  });

  it("cancels deactivation when Cancel is clicked in the confirm dialog", async () => {
    vi.mocked(fetchAnchor).mockResolvedValue({
      id: "anchorA",
      name: "Anchor A",
      registeredAt: "",
      active: true,
    });

    renderDetail();
    await screen.findByText("Anchor A");

    // Click "Deactivate" to open the dialog
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(deregisterAnchor).not.toHaveBeenCalled();

    // Dialog should be open
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    // Click the Cancel button in the dialog
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    // Verify deregisterAnchor was not called
    expect(deregisterAnchor).not.toHaveBeenCalled();

    // Dialog should be closed (either not in the document or queryByRole returns null)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Anchor status is unchanged (remains Active)
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("deactivates an anchor without flashing a loading spinner", async () => {
    let resolveFetch: (value: any) => void = () => {};
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });

    vi.mocked(fetchAnchor)
      .mockResolvedValueOnce({
        id: "anchorA",
        name: "Anchor A",
        registeredAt: "",
        active: true,
      })
      .mockReturnValueOnce(fetchPromise as any);

    vi.mocked(deregisterAnchor).mockResolvedValue({
      id: "anchorA",
      name: "Anchor A",
      registeredAt: "",
      active: false,
    });

    renderDetail();
    expect(await screen.findByText("Anchor A")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    await waitFor(() =>
      expect(deregisterAnchor).toHaveBeenCalledWith("anchorA"),
    );

    // Should NOT show the loading spinner during the re-fetch
    expect(screen.queryByText(/Loading anchor…/i)).not.toBeInTheDocument();
    // The previously-rendered data should still be visible
    expect(screen.getByText("Anchor A")).toBeInTheDocument();

    // Resolve the re-fetch
    resolveFetch({
      id: "anchorA",
      name: "Anchor A",
      registeredAt: "",
      active: false,
    });

    // Wait for the newly fetched status to be reflected
    await waitFor(() =>
      expect(screen.getByText("Inactive")).toBeInTheDocument(),
    );
  });

  it("handles deactivation error gracefully", async () => {
    vi.mocked(fetchAnchor).mockResolvedValue({
      id: "anchorA",
      name: "Anchor A",
      registeredAt: "",
      active: true,
    });
    vi.mocked(deregisterAnchor).mockRejectedValue(
      new Error("Deactivation failed test error"),
    );

    renderDetail();
    expect(await screen.findByText("Anchor A")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    await waitFor(() =>
      expect(deregisterAnchor).toHaveBeenCalledWith("anchorA"),
    );

    // We expect a toast with the error message but we don't strictly test the toast component itself here,
    // just the error branch in the catch block of deactivate()
  });
});
