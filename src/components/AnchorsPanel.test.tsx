import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { AnchorsPanel } from "./AnchorsPanel";
import { ToastProvider } from "./ToastProvider";
import {
  fetchAnchors,
  registerAnchor,
  deregisterAnchor,
} from "@/lib/anchorsApi";

vi.mock("@/lib/anchorsApi", () => ({
  fetchAnchors: vi.fn(),
  registerAnchor: vi.fn(),
  deregisterAnchor: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
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

    expect(screen.getByText("Stellar Vault")).toBeInTheDocument();
    expect(screen.queryByText("Something Else")).not.toBeInTheDocument();
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

    expect(
      screen.getByText("No anchors match your search or filter."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No anchors registered yet."),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByText("Anchor A")).toBeInTheDocument();
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
});
