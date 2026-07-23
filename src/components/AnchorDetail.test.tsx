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
    vi.mocked(fetchAnchor).mockRejectedValue(new ApiRequestError(404, "NOT_FOUND", "Not found"));

    renderDetail();

    // Expect the distinct not‑found text
    expect(await screen.findByText(/anchor not found/i)).toBeInTheDocument();
    const backLink = screen.getByRole("link", { name: /back to anchors/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/anchors");
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

  it("skips fetchAnchor on mount when initialData is provided", () => {
    const initialData = {
      id: "anchorA",
      name: "Anchor A (Seeded)",
      registeredAt: "2026-01-01T00:00:00.000Z",
      active: true,
    };

    render(
      <ToastProvider>
        <AnchorDetail id="anchorA" initialData={initialData} />
      </ToastProvider>,
    );

    expect(screen.getByText("Anchor A (Seeded)")).toBeInTheDocument();
    expect(fetchAnchor).not.toHaveBeenCalled();
  });

  it("calls fetchAnchor when reloading after deactivating an anchor initialized with initialData", async () => {
    const initialData = {
      id: "anchorA",
      name: "Anchor A (Seeded)",
      registeredAt: "2026-01-01T00:00:00.000Z",
      active: true,
    };
    vi.mocked(deregisterAnchor).mockResolvedValue({
      ...initialData,
      active: false,
    });
    vi.mocked(fetchAnchor).mockResolvedValue({
      ...initialData,
      active: false,
    });

    render(
      <ToastProvider>
        <AnchorDetail id="anchorA" initialData={initialData} />
      </ToastProvider>,
    );

    expect(screen.getByText("Anchor A (Seeded)")).toBeInTheDocument();
    expect(fetchAnchor).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    await waitFor(() => expect(deregisterAnchor).toHaveBeenCalledWith("anchorA"));
    await waitFor(() => expect(fetchAnchor).toHaveBeenCalledTimes(1));
  });
});
