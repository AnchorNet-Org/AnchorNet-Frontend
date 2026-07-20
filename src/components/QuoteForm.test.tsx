import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuoteForm } from "./QuoteForm";
import { requestQuote } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  requestQuote: vi.fn(),
}));

describe("QuoteForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a non-positive amount without calling the API", async () => {
    render(<QuoteForm />);
    fireEvent.change(screen.getByPlaceholderText("1000"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    expect(
      await screen.findByText(/enter a positive amount/i),
    ).toBeInTheDocument();
    expect(requestQuote).not.toHaveBeenCalled();
  });

  it("renders the quote result on success", async () => {
    vi.mocked(requestQuote).mockResolvedValue({
      asset: "USDC",
      amount: 1000,
      fee: 10,
      deliverable: 990,
      route: ["big", "mid"],
    });

    render(<QuoteForm />);
    fireEvent.change(screen.getByPlaceholderText("USDC"), {
      target: { value: " USDC " },
    });
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    await waitFor(() => {
      expect(screen.getByText(/990 USDC/)).toBeInTheDocument();
    });
    expect(screen.getByText("big → mid")).toBeInTheDocument();
    expect(requestQuote).toHaveBeenCalledWith({ asset: "USDC", amount: 1000 });
  });

  it("offers a copy button wired to the joined route text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    vi.mocked(requestQuote).mockResolvedValue({
      asset: "USDC",
      amount: 1000,
      fee: 10,
      deliverable: 990,
      route: ["big", "mid"],
    });

    render(<QuoteForm />);
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    const copyButton = await screen.findByRole("button", { name: "Copy" });
    fireEvent.click(copyButton);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("big → mid"));
  });

  it("shows no copy button when the route is empty", async () => {
    vi.mocked(requestQuote).mockResolvedValue({
      asset: "USDC",
      amount: 1000,
      fee: 10,
      deliverable: 990,
      route: [],
    });

    render(<QuoteForm />);
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    expect(await screen.findByText("—")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy" }),
    ).not.toBeInTheDocument();
  });

  it("shows an error message when the API call fails", async () => {
    vi.mocked(requestQuote).mockRejectedValue(
      new Error("insufficient liquidity"),
    );

    render(<QuoteForm />);
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    expect(
      await screen.findByText(/insufficient liquidity/i),
    ).toBeInTheDocument();
  });

  it("shows a generic message when the API rejects with a non-Error", async () => {
    vi.mocked(requestQuote).mockRejectedValue("boom");

    render(<QuoteForm />);
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    expect(await screen.findByText(/quote failed/i)).toBeInTheDocument();
  });
});
