import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuoteForm } from "./QuoteForm";
import { ApiRequestError, requestQuote } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    requestQuote: vi.fn(),
    // fetchPools is not called when knownAssets prop is supplied
    fetchPools: vi.fn().mockResolvedValue([]),
  };
});

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

  it("shows a calm retry message when quote requests are rate-limited", async () => {
    vi.mocked(requestQuote).mockRejectedValue(
      new ApiRequestError(429, "RATE_LIMITED", "too many requests"),
    );

    render(<QuoteForm />);
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    expect(
      await screen.findByText("You're quoting too quickly — try again in a moment."),
    ).toBeInTheDocument();
    expect(screen.queryByText("too many requests")).not.toBeInTheDocument();
  });

  it("shows a generic message when the API rejects with a non-Error", async () => {
    vi.mocked(requestQuote).mockRejectedValue("boom");

    render(<QuoteForm />);
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    expect(await screen.findByText(/quote failed/i)).toBeInTheDocument();
  });

  it("renders datalist options for each knownAssets entry", () => {
    render(<QuoteForm knownAssets={["USDC", "EURC", "XLM"]} />);

    const datalist = document.getElementById("quote-form-asset-list");
    expect(datalist).toBeInTheDocument();

    const options = datalist!.querySelectorAll("option");
    const values = Array.from(options).map((o) => o.value);
    expect(values).toEqual(["USDC", "EURC", "XLM"]);
  });

  it("binds the asset input to the datalist via the list attribute", () => {
    render(<QuoteForm knownAssets={["USDC", "EURC"]} />);

    const assetInput = screen.getByPlaceholderText("USDC");
    expect(assetInput).toHaveAttribute("list", "quote-form-asset-list");
  });

  it("omits the datalist and list attribute when knownAssets is empty", () => {
    render(<QuoteForm knownAssets={[]} />);

    expect(document.getElementById("quote-form-asset-list")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("USDC")).not.toHaveAttribute("list");
  });

  it("still allows free-form entry when knownAssets is not provided", async () => {
    vi.mocked(requestQuote).mockResolvedValue({
      asset: "MYASSET",
      amount: 500,
      fee: 5,
      deliverable: 495,
      route: [],
    });

    render(<QuoteForm />);
    fireEvent.change(screen.getByPlaceholderText("USDC"), {
      target: { value: "MYASSET" },
    });
    fireEvent.change(screen.getByPlaceholderText("1000"), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get quote/i }));

    await waitFor(() => {
      expect(screen.getByText(/495 MYASSET/)).toBeInTheDocument();
    });
    expect(requestQuote).toHaveBeenCalledWith({ asset: "MYASSET", amount: 500 });
  });
});
