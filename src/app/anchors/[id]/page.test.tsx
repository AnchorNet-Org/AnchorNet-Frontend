import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { notFound } from "next/navigation";
import AnchorDetailPage from "./page";
import { fetchAnchor } from "@/lib/anchorsApi";
import { ApiRequestError } from "@/lib/api";

vi.mock("next/navigation", () => ({
  notFound: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/components/SiteHeader", () => ({
  SiteHeader: () => <div data-testid="site-header" />,
}));

vi.mock("@/components/AnchorDetail", () => ({
  AnchorDetail: ({ id }: { id: string }) => (
    <div data-testid="anchor-detail">{id}</div>
  ),
}));

vi.mock("@/lib/anchorsApi", () => ({
  fetchAnchor: vi.fn(),
}));

describe("AnchorDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders breadcrumb trailing item using decodedId for percent-encoded id", async () => {
    const mockAnchor = {
      id: "anchor one",
      name: "Anchor One",
      registeredAt: "2026-01-01T00:00:00.000Z",
      active: true,
    };
    vi.mocked(fetchAnchor).mockResolvedValue(mockAnchor);

    const jsx = await AnchorDetailPage({
      params: Promise.resolve({ id: "anchor%20one" }),
    });
    render(jsx);

    expect(fetchAnchor).toHaveBeenCalledWith("anchor one");

    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(nav).toHaveTextContent("anchor one");
    expect(nav).not.toHaveTextContent("anchor%20one");
  });

  it("renders breadcrumb trailing item for non-encoded id", async () => {
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

  it("calls notFound when fetchAnchor throws ApiRequestError with status 404", async () => {
    vi.mocked(fetchAnchor).mockRejectedValue(
      new ApiRequestError(404, "NOT_FOUND", "Anchor not found"),
    );

    await expect(
      AnchorDetailPage({
        params: Promise.resolve({ id: "non-existent" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-404 errors from fetchAnchor", async () => {
    const genericError = new ApiRequestError(500, "INTERNAL_ERROR", "Server Error");
    vi.mocked(fetchAnchor).mockRejectedValue(genericError);

    await expect(
      AnchorDetailPage({
        params: Promise.resolve({ id: "test-anchor" }),
      }),
    ).rejects.toThrow("Server Error");
  });
});
