import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AnchorDetailPage from "./page";
import { fetchAnchor } from "@/lib/anchorsApi";
import { ApiRequestError } from "@/lib/api";
import { notFound } from "next/navigation";
import { AnchorDetail } from "@/components/AnchorDetail";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/anchorsApi", () => ({
  fetchAnchor: vi.fn(),
}));

vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));

vi.mock("@/components/AnchorDetail", () => ({
  AnchorDetail: vi.fn(({ id, initialData }: { id: string; initialData?: unknown }) => (
    <div
      data-testid="anchor-detail"
      data-id={id}
      data-initial={JSON.stringify(initialData)}
    >
      Anchor Detail Component
    </div>
  )),
}));

describe("AnchorDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers notFound() when fetchAnchor throws a 404 ApiRequestError", async () => {
    const error404 = new ApiRequestError(404, "NOT_FOUND", "Anchor not found");
    vi.mocked(fetchAnchor).mockRejectedValue(error404);

    await expect(
      AnchorDetailPage({ params: Promise.resolve({ id: "anchor%20404" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(fetchAnchor).toHaveBeenCalledWith("anchor 404");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("re-throws a non-404 ApiRequestError without calling notFound()", async () => {
    const error500 = new ApiRequestError(500, "SERVER_ERROR", "Internal Server Error");
    vi.mocked(fetchAnchor).mockRejectedValue(error500);

    await expect(
      AnchorDetailPage({ params: Promise.resolve({ id: "anchor1" }) }),
    ).rejects.toThrow(error500);

    expect(fetchAnchor).toHaveBeenCalledWith("anchor1");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("re-throws generic non-ApiRequestError without calling notFound()", async () => {
    const genericError = new Error("Network connection lost");
    vi.mocked(fetchAnchor).mockRejectedValue(genericError);

    await expect(
      AnchorDetailPage({ params: Promise.resolve({ id: "anchor1" }) }),
    ).rejects.toThrow("Network connection lost");

    expect(fetchAnchor).toHaveBeenCalledWith("anchor1");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("renders the page with decoded id and fetched initialData upon successful fetch", async () => {
    const mockAnchor = {
      id: "anchor one",
      name: "Anchor One",
      registeredAt: "2026-01-01T00:00:00.000Z",
      active: true,
    };
    vi.mocked(fetchAnchor).mockResolvedValue(mockAnchor);

    const page = await AnchorDetailPage({
      params: Promise.resolve({ id: "anchor%20one" }),
    });

    render(page);

    expect(fetchAnchor).toHaveBeenCalledWith("anchor one");
    expect(notFound).not.toHaveBeenCalled();
    expect(screen.getByText("Anchor detail")).toBeInTheDocument();
    expect(screen.getByTestId("anchor-detail")).toBeInTheDocument();
    expect(AnchorDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "anchor one",
        initialData: mockAnchor,
      }),
      undefined,
    );

    // The breadcrumb's trailing item must show the decoded id, not the raw
    // percent-encoded route param.
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav).toHaveTextContent("anchor one");
    expect(nav).not.toHaveTextContent("anchor%20one");
  });

  it("renders breadcrumb trailing item for a non-encoded id", async () => {
    const mockAnchor = {
      id: "anchor-1",
      name: "Anchor 1",
      registeredAt: "2026-01-01T00:00:00.000Z",
      active: true,
    };
    vi.mocked(fetchAnchor).mockResolvedValue(mockAnchor);

    const jsx = await AnchorDetailPage({
      params: Promise.resolve({ id: "anchor-1" }),
    });
    render(jsx);

    expect(fetchAnchor).toHaveBeenCalledWith("anchor-1");
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav).toHaveTextContent("anchor-1");
  });
});
