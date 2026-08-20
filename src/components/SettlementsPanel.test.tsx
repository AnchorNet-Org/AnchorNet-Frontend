import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SettlementsPanel } from "./SettlementsPanel";
import { ToastProvider } from "./ToastProvider";
import {
  executeSettlement,
  exportSettlementsCsv,
  fetchSettlements,
  openSettlement,
} from "@/lib/settlementsApi";
import { ApiRequestError, fetchPools } from "@/lib/api";
import { Settlement } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settlements",
}));

vi.mock("@/lib/settlementsApi", () => ({
  fetchSettlements: vi.fn(),
  openSettlement: vi.fn(),
  executeSettlement: vi.fn(),
  cancelSettlement: vi.fn(),
  exportSettlementsCsv: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, fetchPools: vi.fn() };
});

const settlement: Settlement = {
  id: 7,
  anchor: "stellar-anchor",
  asset: "USDC",
  amount: 100,
  fee: 1,
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const firstPage = {
  settlements: [settlement],
  pagination: { page: 1, pageSize: 10, total: 2, totalPages: 2 },
};

function renderPanel() {
  return render(
    <ToastProvider>
      <SettlementsPanel />
    </ToastProvider>,
  );
}

describe("SettlementsPanel API error classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPools).mockResolvedValue([]);
    vi.mocked(fetchSettlements).mockResolvedValue(firstPage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders classified copy for an initial network failure", async () => {
    vi.mocked(fetchSettlements).mockRejectedValue(
      new ApiRequestError(undefined, "NETWORK_ERROR", "internal", undefined, {
        kind: "network",
      }),
    );

    renderPanel();

    expect(
      await screen.findByText(
        "Unable to reach the server. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
  });

  it("renders classified copy when loading another page fails", async () => {
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce(firstPage)
      .mockRejectedValueOnce(
        new ApiRequestError(undefined, "TIMEOUT", "internal", undefined, {
          kind: "timeout",
        }),
      );

    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(
      await screen.findByText("The request timed out. Try again."),
    ).toBeInTheDocument();
  });

  it("reports and safely displays a failed settlement action", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(executeSettlement).mockRejectedValue(
      new ApiRequestError(503, "UNAVAILABLE", "internal detail"),
    );

    renderPanel();
    const executeButtons = await screen.findAllByRole("button", {
      name: "Execute",
    });
    fireEvent.click(executeButtons[0]);

    expect(
      await screen.findByText(
        "The service is temporarily unavailable. Try again.",
      ),
    ).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("kind=server"),
      expect.any(ApiRequestError),
    );
  });

  it("suppresses an aborted open operation", async () => {
    vi.mocked(openSettlement).mockRejectedValue(
      new DOMException("cancelled", "AbortError"),
    );

    renderPanel();
    await waitFor(() => expect(fetchSettlements).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "stellar-anchor" },
    });
    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open settlement" }));

    await waitFor(() => expect(openSettlement).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Request failed.")).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /error/i })).not.toBeInTheDocument();
  });

  it("uses the requested fallback for an unclassified export failure", async () => {
    vi.mocked(exportSettlementsCsv).mockRejectedValue("failure");

    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Export CSV" }));

    expect(
      await screen.findByText("Failed to export CSV."),
    ).toBeInTheDocument();
  });
});
