import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettlementForm } from "./SettlementForm";

describe("SettlementForm", () => {
  it("blocks submission and flags every missing field", () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("Asset"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByText("Open settlement"));

    expect(screen.getByText("Anchor id is required.")).toBeInTheDocument();
    expect(screen.getByText("Asset is required.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid amount.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a non-positive amount", () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "anchor-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByText("Open settlement"));

    expect(
      screen.getByText("Amount must be greater than zero."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed values and resets the amount field", async () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: " anchor-a " },
    });
    const amountInput = screen.getByPlaceholderText("Amount");
    fireEvent.change(amountInput, { target: { value: "500" } });
    fireEvent.click(screen.getByText("Open settlement"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        anchor: "anchor-a",
        asset: "USDC",
        amount: 500,
      });
      expect(amountInput).toHaveValue("");
    });
  });

  it("clears a field's error as soon as it is edited", () => {
    render(<SettlementForm onSubmit={() => {}} />);

    fireEvent.click(screen.getByText("Open settlement"));
    expect(screen.getByText("Anchor id is required.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "a" },
    });
    expect(screen.queryByText("Anchor id is required.")).not.toBeInTheDocument();
  });

  it("does not clear amount field if submission fails", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(<SettlementForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "anchor-a" },
    });
    const amountInput = screen.getByPlaceholderText("Amount");
    fireEvent.change(amountInput, { target: { value: "100" } });
    fireEvent.click(screen.getByText("Open settlement"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      expect(amountInput).toHaveValue("100");
    });
  });

  it("clears all field values, errors, and focuses the anchor field after reset", () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} />);

    const anchorInput = screen.getByPlaceholderText("Anchor id");
    const assetInput = screen.getByPlaceholderText("Asset");
    const amountInput = screen.getByPlaceholderText("Amount");

    // Fill in invalid/partial data and attempt to submit to trigger all errors.
    fireEvent.change(assetInput, { target: { value: "" } });
    fireEvent.change(amountInput, { target: { value: "-5" } });
    fireEvent.click(screen.getByText("Open settlement"));

    // Confirm errors are shown and onSubmit was not called.
    expect(screen.getByText("Anchor id is required.")).toBeInTheDocument();
    expect(screen.getByText("Asset is required.")).toBeInTheDocument();
    expect(screen.getByText("Amount must be greater than zero.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    // Also put some text into anchor to make the reset more meaningful.
    fireEvent.change(anchorInput, { target: { value: "partial-anchor" } });
    fireEvent.change(assetInput, { target: { value: "BTC" } });

    // Click Reset.
    fireEvent.click(screen.getByText("Reset"));

    // All field values must be cleared / restored to initial defaults.
    expect(anchorInput).toHaveValue("");
    expect(assetInput).toHaveValue("USDC");
    expect(amountInput).toHaveValue("");

    // All error messages must be gone.
    expect(screen.queryByText("Anchor id is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Asset is required.")).not.toBeInTheDocument();
    expect(screen.queryByText("Enter a valid amount.")).not.toBeInTheDocument();
    expect(screen.queryByText("Amount must be greater than zero.")).not.toBeInTheDocument();

    // The anchor input must receive focus.
    expect(anchorInput).toHaveFocus();

    // Reset must not have triggered a network request.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when Reset is clicked", () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "anchor-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByText("Reset"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders asset suggestions from availableLiquidity", () => {
    const onSubmit = vi.fn();
    render(
      <SettlementForm
        onSubmit={onSubmit}
        availableLiquidity={{ USDC: 1000, BTC: 500, EURT: 250 }}
      />,
    );

    const input = screen.getByPlaceholderText("Asset");
    expect(input).toHaveAttribute("list", "settlement-form-asset-list");
    const datalist = document.getElementById("settlement-form-asset-list");
    expect(datalist).toBeInTheDocument();
    expect(datalist?.querySelectorAll("option")).toHaveLength(3);
    expect(Array.from(datalist?.querySelectorAll("option") ?? []).map((option) => option.value)).toEqual([
      "USDC",
      "BTC",
      "EURT",
    ]);
  });

  it("does not render a datalist when availableLiquidity is absent", () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText("Asset");
    expect(input).not.toHaveAttribute("list");
    expect(document.getElementById("settlement-form-asset-list")).not.toBeInTheDocument();
  });

  it("rejects amount exceeding available liquidity", () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} availableLiquidity={{ USDC: 100 }} />);

    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "anchor-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Asset"), {
      target: { value: "USDC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "150" },
    });
    fireEvent.click(screen.getByText("Open settlement"));

    expect(screen.getByText("Amount exceeds available liquidity.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits amount within available liquidity", async () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} availableLiquidity={{ USDC: 100 }} />);

    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "anchor-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Asset"), {
      target: { value: "USDC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByText("Open settlement"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        anchor: "anchor-a",
        asset: "USDC",
        amount: 100,
      });
    });
  });
});

  it("rejects submission when asset case differs and exceeds liquidity", () => {
    const onSubmit = vi.fn();
    render(
      <SettlementForm
        onSubmit={onSubmit}
        availableLiquidity={{ USDC: 1000 }}
      />,
    );
    // Use lowercase asset code
    fireEvent.change(screen.getByPlaceholderText("Asset"), {
      target: { value: "usdc" },
    });
    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "1500" },
    });
    fireEvent.click(screen.getByText("Open settlement"));
    // Expect liquidity error
    expect(screen.getByText(/Insufficient liquidity/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
