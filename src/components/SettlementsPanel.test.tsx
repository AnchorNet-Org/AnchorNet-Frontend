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

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsString = "";
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

  it("executes a settlement", async () => {
    vi.mocked(fetchSettlements).mockResolvedValue(page([sample]));
    vi.mocked(executeSettlement).mockResolvedValue({
      ...sample,
      status: "executed",
    });

    renderPanel();
    await screen.findByText("anchorA");

    fireEvent.click(screen.getByRole("button", { name: "Execute" }));

    await waitFor(() => expect(executeSettlement).toHaveBeenCalledWith(1));
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
});
