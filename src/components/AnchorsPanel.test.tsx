import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import { AnchorsPanel } from "./AnchorsPanel";
import { ToastProvider } from "./ToastProvider";
import {
  fetchAnchors,
  registerAnchor,
  deregisterAnchor,
} from "@/lib/anchorsApi";

// ---------------------------------------------------------------------------
// Mock next/navigation so the panel can run in jsdom.
// ---------------------------------------------------------------------------

const mockReplace = vi.fn();
let mockSearchParamsString = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
  usePathname: () => "/anchors",
}));

vi.mock("@/lib/anchorsApi", () => ({
  fetchAnchors: vi.fn(),
  registerAnchor: vi.fn(),
  deregisterAnchor: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsString = "";
});

function renderPanel() {
  return render(
    <ToastProvider>
      <AnchorsPanel />
    </ToastProvider>,
  );
}

describe("AnchorsPanel", () => {
  it("lists loaded anchors", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
      { id: "b", name: "Anchor B", registeredAt: "", active: false },
    ]);

    renderPanel();

    expect(await screen.findByText("Anchor A")).toBeInTheDocument();
    expect(screen.getByText("Anchor B")).toBeInTheDocument();
  });

  it("filters the list by status", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
      { id: "b", name: "Anchor B", registeredAt: "", active: false },
    ]);

    renderPanel();
    await screen.findByText("Anchor A");

    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    expect(screen.getByText("Anchor A")).toBeInTheDocument();
    expect(screen.queryByText("Anchor B")).not.toBeInTheDocument();
  });

  it("focuses the search box when / is pressed", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
    ]);

    renderPanel();
    await screen.findByText("Anchor A");

    fireEvent.keyDown(document.body, { key: "/" });

    expect(document.activeElement).toBe(
      screen.getByLabelText("Search anchors"),
    );
  });

  it("filters the list via the search box", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "stellar-anchor", name: "Stellar Vault", registeredAt: "", active: true },
      { id: "other", name: "Something Else", registeredAt: "", active: true },
    ]);

    renderPanel();
    await screen.findByText("Stellar Vault");

    fireEvent.change(screen.getByLabelText("Search anchors"), {
      target: { value: "vault" },
    });

    // Filtering is debounced, so the non-matching row only drops out once the
    // debounce delay has elapsed.
    await waitFor(() =>
      expect(screen.queryByText("Something Else")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Stellar Vault")).toBeInTheDocument();
  });

  it("debounces the search filter, updating the list only after the delay", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(fetchAnchors).mockResolvedValue([
        {
          id: "stellar-anchor",
          name: "Stellar Vault",
          registeredAt: "",
          active: true,
        },
        { id: "other", name: "Something Else", registeredAt: "", active: true },
      ]);

      renderPanel();

      // Flush the mocked fetch promise and mount effects so the list renders.
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText("Stellar Vault")).toBeInTheDocument();
      expect(screen.getByText("Something Else")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Search anchors"), {
        target: { value: "vault" },
      });

      // The input reflects the keystroke immediately (no typing lag)...
      expect(screen.getByLabelText("Search anchors")).toHaveValue("vault");
      // ...but the filtered list has not been recomputed yet.
      expect(screen.getByText("Something Else")).toBeInTheDocument();

      // Just before the debounce elapses, the list is still unchanged.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(199);
      });
      expect(screen.getByText("Something Else")).toBeInTheDocument();

      // Once the debounce delay elapses, the non-matching row is filtered out.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.queryByText("Something Else")).not.toBeInTheDocument();
      expect(screen.getByText("Stellar Vault")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the no-data empty state without a clear-filters action", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([]);

    renderPanel();

    expect(
      await screen.findByText("No anchors registered yet."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("shows a no-results empty state when the search matches nothing", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
    ]);

    renderPanel();
    await screen.findByText("Anchor A");

    fireEvent.change(screen.getByLabelText("Search anchors"), {
      target: { value: "zzz" },
    });

    // The no-results state appears only after the debounce delay elapses.
    await waitFor(() =>
      expect(
        screen.getByText("No anchors match your search or filter."),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("No anchors registered yet."),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() =>
      expect(screen.getByText("Anchor A")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Search anchors")).toHaveValue("");
  });

  it("clears the status filter from the no-results empty state", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
    ]);

    renderPanel();
    await screen.findByText("Anchor A");

    fireEvent.click(screen.getByRole("button", { name: "Inactive" }));
    expect(
      screen.getByText("No anchors match your search or filter."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByText("Anchor A")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("registers a new anchor and reloads the list", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([]);
    vi.mocked(registerAnchor).mockResolvedValue({
      id: "new-anchor",
      name: "new-anchor",
      registeredAt: "",
      active: true,
    });

    renderPanel();
    await waitFor(() => expect(fetchAnchors).toHaveBeenCalledTimes(1));

    fireEvent.change(
      screen.getByPlaceholderText("Anchor id (account or domain)"),
      { target: { value: "new-anchor" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => expect(registerAnchor).toHaveBeenCalledWith({
      id: "new-anchor",
      name: undefined,
    }));
    expect(
      await screen.findByText(/registered anchor "new-anchor"/i),
    ).toBeInTheDocument();
  });

  it("surfaces a field-level error on failed registration and does not clear the form", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([]);
    vi.mocked(registerAnchor).mockRejectedValue(new Error("Duplicate anchor id"));

    renderPanel();
    await waitFor(() => expect(fetchAnchors).toHaveBeenCalledTimes(1));

    const idInput = screen.getByPlaceholderText("Anchor id (account or domain)");
    fireEvent.change(idInput, { target: { value: "existing-anchor" } });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(registerAnchor).toHaveBeenCalledWith({
        id: "existing-anchor",
        name: undefined,
      });
      expect(idInput).toHaveValue("existing-anchor");
      expect(screen.getByText("Duplicate anchor id")).toBeInTheDocument();
    });
  });

  it("confirms before deactivating an anchor", async () => {
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
    ]);
    vi.mocked(deregisterAnchor).mockResolvedValue({
      id: "a",
      name: "Anchor A",
      registeredAt: "",
      active: false,
    });

    renderPanel();
    await screen.findByText("Anchor A");

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(deregisterAnchor).not.toHaveBeenCalled();

    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(deregisterAnchor).toHaveBeenCalledWith("a"));
  });

  // -------------------------------------------------------------------------
  // URL querystring hydration tests
  // -------------------------------------------------------------------------

  it("hydrates the status filter from the URL querystring on load", async () => {
    mockSearchParamsString = "status=active";
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
      { id: "b", name: "Anchor B", registeredAt: "", active: false },
    ]);

    renderPanel();
    await screen.findByText("Anchor A");

    // Only the active anchor should be visible; the Active tab should be pressed
    expect(screen.getByText("Anchor A")).toBeInTheDocument();
    expect(screen.queryByText("Anchor B")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Active" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("hydrates the search query from the URL querystring on load", async () => {
    mockSearchParamsString = "q=vault";
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "stellar-anchor", name: "Stellar Vault", registeredAt: "", active: true },
      { id: "other", name: "Something Else", registeredAt: "", active: true },
    ]);

    renderPanel();
    await screen.findByText("Stellar Vault");

    // Only matching anchor visible; search box pre-filled
    expect(screen.getByText("Stellar Vault")).toBeInTheDocument();
    expect(screen.queryByText("Something Else")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search anchors")).toHaveValue("vault");
  });

  it("updates the URL querystring when the status filter changes", async () => {
    mockSearchParamsString = "";
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
    ]);

    renderPanel();
    await screen.findByText("Anchor A");

    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("status=active"),
      { scroll: false },
    );
  });

  it("updates the URL querystring when the search query changes", async () => {
    mockSearchParamsString = "";
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
    ]);

    renderPanel();
    await screen.findByText("Anchor A");

    fireEvent.change(screen.getByLabelText("Search anchors"), {
      target: { value: "foo" },
    });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("q=foo"),
      { scroll: false },
    );
  });

  it("removes the status param from the URL when All is selected", async () => {
    mockSearchParamsString = "status=active";
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
    ]);

    renderPanel();
    await screen.findByText("Anchor A");

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    // 'all' is the default so the param should be stripped
    expect(mockReplace).toHaveBeenCalledWith("/anchors", { scroll: false });
  });

  it("ignores an unrecognised status param and falls back to 'all'", async () => {
    mockSearchParamsString = "status=unknown";
    vi.mocked(fetchAnchors).mockResolvedValue([
      { id: "a", name: "Anchor A", registeredAt: "", active: true },
      { id: "b", name: "Anchor B", registeredAt: "", active: false },
    ]);

    renderPanel();
    await screen.findByText("Anchor A");

    // Both anchors visible because filter falls back to 'all'
    expect(screen.getByText("Anchor A")).toBeInTheDocument();
    expect(screen.getByText("Anchor B")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "All" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
