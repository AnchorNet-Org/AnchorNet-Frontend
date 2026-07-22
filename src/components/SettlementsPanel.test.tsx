import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { SettlementsPanel } from "./SettlementsPanel";
import { ToastProvider } from "./ToastProvider";
import {
  fetchSettlements,
  openSettlement,
  executeSettlement,
  cancelSettlement,
} from "@/lib/settlementsApi";
import { Settlement, SettlementsPage } from "@/lib/types";
import { fetchPools } from "@/lib/api";

// ---------------------------------------------------------------------------
// Mock next/navigation so the panel can run in jsdom.
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();
let mockSearchParamsString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
  usePathname: () => "/settlements",
}));

vi.mock("@/lib/settlementsApi", () => ({
  fetchSettlements: vi.fn(),
  openSettlement: vi.fn(),
  executeSettlement: vi.fn(),
  cancelSettlement: vi.fn(),
  exportSettlementsCsv: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  fetchPools: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsString = "";
  vi.mocked(fetchPools).mockResolvedValue([]);
});

function page(
  settlements: Settlement[],
  overrides: Partial<{ page: number; totalPages: number; total: number }> = {},
): SettlementsPage {
  return {
    settlements,
    pagination: {
      page: overrides.page ?? 1,
      pageSize: 10,
      total: overrides.total ?? settlements.length,
      totalPages: overrides.totalPages ?? 1,
    },
  };
}

function renderPanel() {
  return render(
    <ToastProvider>
      <SettlementsPanel />
    </ToastProvider>,
  );
}

const sample = {
  id: 1,
  anchor: "anchorA",
  asset: "USDC",
  amount: 400,
  fee: 4,
  status: "pending" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("SettlementsPanel", () => {
  it("lists loaded settlements", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();

    expect(await screen.findByText("anchorA")).toBeInTheDocument();
  });

  it("focuses the search box when / is pressed", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.keyDown(document.body, { key: "/" });

    expect(document.activeElement).toBe(
      screen.getByLabelText("Search settlements"),
    );
  });

  it("filters the list via the search box", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(
      page([sample, { ...sample, id: 2, anchor: "other" }]),
    );

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.change(screen.getByLabelText("Search settlements"), {
      target: { value: "anchorA" },
    });

    expect(screen.getByText("anchorA")).toBeInTheDocument();
    expect(screen.queryByText("other")).not.toBeInTheDocument();
  });

  it("shows the no-data empty state without a clear-filters action", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([]));

    renderPanel();

    expect(
      await screen.findByText("No settlements yet."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("shows a no-results empty state when the search matches nothing", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.change(screen.getByLabelText("Search settlements"), {
      target: { value: "zzz" },
    });

    expect(
      screen.getByText("No settlements match your search."),
    ).toBeInTheDocument();
    expect(screen.queryByText("No settlements yet.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByText("anchorA")).toBeInTheDocument();
    expect(screen.getByLabelText("Search settlements")).toHaveValue("");
  });

  it("loads more settlements and appends them", async () => {
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce(page([sample], { totalPages: 2, total: 2 }))
      .mockResolvedValueOnce(
        page([{ ...sample, id: 2 }], { page: 2, totalPages: 2, total: 2 }),
      );

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() => expect(fetchSettlements).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText("anchorA")).toHaveLength(2);
  });

  it("announces the number of newly-loaded settlements via a live region", async () => {
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce(page([sample], { totalPages: 2, total: 3 }))
      .mockResolvedValueOnce(
        page(
          [
            { ...sample, id: 2 },
            { ...sample, id: 3 },
          ],
          { page: 2, totalPages: 2, total: 3 },
        ),
      );

    const { container } = renderPanel();
    await screen.findByText("anchorA");

    // No announcement on the initial page load.
    const liveRegion = container.querySelector('[aria-live="polite"].sr-only');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveTextContent("");

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    await waitFor(() =>
      expect(liveRegion).toHaveTextContent("Loaded 2 more settlements"),
    );
  });

  it("announces a singular label when one settlement is appended", async () => {
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce(page([sample], { totalPages: 2, total: 2 }))
      .mockResolvedValueOnce(
        page([{ ...sample, id: 2 }], { page: 2, totalPages: 2, total: 2 }),
      );

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(
      await screen.findByText("Loaded 1 more settlement"),
    ).toBeInTheDocument();
  });

  it("does not announce when Load more fails", async () => {
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce(page([sample], { totalPages: 2, total: 2 }))
      .mockRejectedValueOnce(new Error("boom"));

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.queryByText(/loaded \d+ more settlement/i)).not.toBeInTheDocument();
  });

  it("shows a summary once every settlement is loaded", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();

    expect(
      await screen.findByText(/showing all 1 settlement/i),
    ).toBeInTheDocument();
  });

  it("opens a settlement from the form", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([]));
    vi.mocked(openSettlement).mockResolvedValue(sample);

    renderPanel();
    await waitFor(() => expect(fetchSettlements).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "anchorA" },
    });
    fireEvent.change(screen.getByPlaceholderText("Asset"), {
      target: { value: "USDC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "400" },
    });
    fireEvent.click(screen.getByRole("button", { name: /open settlement/i }));

    await waitFor(() =>
      expect(openSettlement).toHaveBeenCalledWith({
        anchor: "anchorA",
        asset: "USDC",
        amount: 400,
      }),
    );
  });

  it("blocks opening a settlement when amount exceeds available liquidity", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([]));
    vi.mocked(fetchPools).mockResolvedValue([{ asset: "USDC", total: 100, anchors: 1 }]);

    renderPanel();
    await waitFor(() => expect(fetchSettlements).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchPools).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "anchorA" },
    });
    fireEvent.change(screen.getByPlaceholderText("Asset"), {
      target: { value: "USDC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "200" },
    });
    fireEvent.click(screen.getByRole("button", { name: /open settlement/i }));

    expect(await screen.findByText("Amount exceeds available liquidity.")).toBeInTheDocument();
    expect(openSettlement).not.toHaveBeenCalled();
  });

  it("updates only the executed row and announces its new status", async () => {
    const other = { ...sample, id: 2, anchor: "anchorB" };
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample, other]));
    vi.mocked(executeSettlement).mockResolvedValue({
      ...sample,
      anchor: "anchorA-updated",
      status: "executed",
    });

    renderPanel();
    await screen.findByText("anchorA");

    const table = screen.getByRole("table");
    const row = screen
      .getByText("anchorA")
      .closest("tr") as HTMLTableRowElement;
    const otherRow = screen
      .getByText("anchorB")
      .closest("tr") as HTMLTableRowElement;
    const visibleBadge = within(row).getByText("Pending");
    const liveRegion = visibleBadge.nextElementSibling as HTMLElement;
    const otherBadge = within(otherRow).getByText("Pending");
    const otherLiveRegion = otherBadge.nextElementSibling as HTMLElement;
    expect(liveRegion).toBeEmptyDOMElement();
    expect(otherLiveRegion).toBeEmptyDOMElement();

    fireEvent.click(within(row).getByRole("button", { name: "Execute" }));

    await waitFor(() => expect(executeSettlement).toHaveBeenCalledWith(1));
    await waitFor(() => expect(liveRegion).toHaveTextContent("Executed"));

    expect(
      screen.queryByLabelText("Loading table data"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBe(table);
    expect(screen.getByText("anchorA-updated").closest("tr")).toBe(row);
    expect(visibleBadge).toBeInTheDocument();
    expect(liveRegion).toBeInTheDocument();
    expect(visibleBadge).toHaveTextContent("Executed");
    expect(screen.getByText("anchorB").closest("tr")).toBe(otherRow);
    expect(otherBadge).toHaveTextContent("Pending");
    expect(otherLiveRegion).toBeEmptyDOMElement();
    expect(fetchSettlements).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Executed settlement #1.")).toBeInTheDocument();
  });

  it("updates a loaded later-page row without discarding loaded settlements", async () => {
    const laterPageSettlement = {
      ...sample,
      id: 2,
      anchor: "anchorB",
    };
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce(page([sample], { totalPages: 2, total: 2 }))
      .mockResolvedValueOnce(
        page([laterPageSettlement], { page: 2, totalPages: 2, total: 2 }),
      );
    vi.mocked(cancelSettlement).mockResolvedValue({
      ...laterPageSettlement,
      status: "cancelled",
    });

    renderPanel();
    await screen.findByText("anchorA");
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    await screen.findByText("anchorB");

    const table = screen.getByRole("table");
    const firstRow = screen
      .getByText("anchorA")
      .closest("tr") as HTMLTableRowElement;
    const laterRow = screen
      .getByText("anchorB")
      .closest("tr") as HTMLTableRowElement;
    const visibleBadge = within(laterRow).getByText("Pending");
    const liveRegion = visibleBadge.nextElementSibling as HTMLElement;
    expect(liveRegion).toBeEmptyDOMElement();

    fireEvent.click(within(laterRow).getByRole("button", { name: "Cancel" }));
    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Cancel settlement",
      }),
    );

    await waitFor(() => expect(cancelSettlement).toHaveBeenCalledWith(2));
    await waitFor(() => expect(liveRegion).toHaveTextContent("Cancelled"));

    expect(screen.queryByLabelText("Loading table data")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBe(table);
    expect(screen.getByText("anchorA").closest("tr")).toBe(firstRow);
    expect(screen.getByText("anchorB").closest("tr")).toBe(laterRow);
    expect(visibleBadge).toHaveTextContent("Cancelled");
    expect(liveRegion).toBeInTheDocument();
    expect(fetchSettlements).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Cancelled settlement #2.")).toBeInTheDocument();
  });

  it("confirms before cancelling a settlement", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));
    vi.mocked(cancelSettlement).mockResolvedValue({
      ...sample,
      status: "cancelled",
    });

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelSettlement).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancel settlement" }),
    );
    await waitFor(() => expect(cancelSettlement).toHaveBeenCalledWith(1));
  });

  // -------------------------------------------------------------------------
  // URL querystring hydration tests
  // -------------------------------------------------------------------------

  it("hydrates the search query from the URL querystring on load", async () => {
    mockSearchParamsString = "q=anchorA";
    vi.mocked(fetchSettlements).mockResolvedValue(
      page([sample, { ...sample, id: 2, anchor: "other" }]),
    );

    renderPanel();
    await screen.findByText("anchorA");

    // Only the matching row visible; search box pre-filled
    expect(screen.getByText("anchorA")).toBeInTheDocument();
    expect(screen.queryByText("other")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search settlements")).toHaveValue("anchorA");
  });

  it("hydrates the page size from the URL querystring on load", async () => {
    mockSearchParamsString = "pageSize=25";
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();
    await screen.findByText("anchorA");

    // The page-size selector should reflect the URL value
    expect(screen.getByLabelText("Rows per page")).toHaveValue("25");
    // fetchSettlements must have been called with pageSize=25
    expect(fetchSettlements).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 25 }),
    );
  });

  it("updates the URL querystring when the search query changes", async () => {
    mockSearchParamsString = "";
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.change(screen.getByLabelText("Search settlements"), {
      target: { value: "foo" },
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("q=foo"),
      { scroll: false },
    );
  });

  it("updates the URL querystring when the page size changes", async () => {
    mockSearchParamsString = "";
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "25" },
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("pageSize=25"),
      { scroll: false },
    );
  });

  it("ignores an invalid pageSize param and falls back to the default", async () => {
    mockSearchParamsString = "pageSize=999";
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();
    await screen.findByText("anchorA");

    // Invalid value — should fall back to 10
    expect(fetchSettlements).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 10 }),
    );
  });

  it("removes the pageSize param from the URL when set to the default", async () => {
    mockSearchParamsString = "pageSize=25";
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "10" },
    });

    // 10 is the default so the param should be stripped
    expect(mockReplace).toHaveBeenCalledWith("/settlements", { scroll: false });
  });

  it("exposes an accessible group for the toolbar controls", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();
    await screen.findByText("anchorA");

    const toolbar = screen.getByRole("search", {
      name: "Settlements export, page size, and search",
    });
    expect(toolbar).toContainElement(
      screen.getByRole("button", { name: "Export CSV" }),
    );
    expect(toolbar).toContainElement(
      screen.getByLabelText("Rows per page"),
    );
    expect(toolbar).toContainElement(
      screen.getByLabelText("Search settlements"),
    );
  });

  it("exports settlements as CSV", async () => {
    const { exportSettlementsCsv } = await import("@/lib/settlementsApi");
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));
    vi.mocked(exportSettlementsCsv).mockResolvedValue("id,anchor\n1,anchorA");

    const createObjectURL = vi.fn().mockReturnValue("blob:mock");
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    await waitFor(() => {
      expect(exportSettlementsCsv).toHaveBeenCalledWith({ pageSize: 10 });
    });

    // Check if the download link was created
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("indicates when the CSV export ignores the active search filter", async () => {
    mockSearchParamsString = "q=anchorA";
    vi.mocked(fetchSettlements).mockResolvedValue(
      page([sample, { ...sample, id: 2, anchor: "other" }]),
    );

    renderPanel();
    await screen.findByText("anchorA");

    const exportBtn = screen.getByRole("button", { name: "Export CSV" });
    expect(exportBtn).toHaveAttribute(
      "title",
      "Export includes all settlements, ignoring the current search filter"
    );
  });

  it("does not indicate ignored search filter when query is empty", async () => {
    mockSearchParamsString = "";
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));

    renderPanel();
    await screen.findByText("anchorA");

    const exportBtn = screen.getByRole("button", { name: "Export CSV" });
    expect(exportBtn).not.toHaveAttribute("title");
  });
});
