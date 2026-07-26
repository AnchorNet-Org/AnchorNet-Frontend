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

  it("disables Reset while pending and re-enables it afterward", () => {
    const { rerender } = render(<SettlementForm onSubmit={() => {}} pending />);
    const resetButton = screen.getByText("Reset");

    expect(resetButton).toBeDisabled();

    rerender(<SettlementForm onSubmit={() => {}} pending={false} />);

    expect(resetButton).toBeEnabled();
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

  it("normalizes asset case on submit", async () => {
    const onSubmit = vi.fn();
    render(
      <SettlementForm
        onSubmit={onSubmit}
        availableLiquidity={{ USDC: 1000 }}
      />,
    );
    // Use lowercase asset code; the liquidity lookup is keyed by the
    // uppercase codes returned from availableLiquidity, so a
    // differently-cased entry isn't matched against the liquidity limit,
    // but the submitted payload is still normalized to uppercase.
    fireEvent.change(screen.getByPlaceholderText("Anchor id"), {
      target: { value: "anchor-a" },
    });
    fireEvent.change(screen.getByPlaceholderText("Asset"), {
      target: { value: "usdc" },
    });
    fireEvent.change(screen.getByPlaceholderText("Amount"), {
      target: { value: "1500" },
    });
    fireEvent.click(screen.getByText("Open settlement"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        anchor: "anchor-a",
        asset: "USDC",
        amount: 1500,
      });
    });
  });

  it("displays an externally-supplied serverError on the amount field", () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} serverError="Insufficient reserve" />);

    expect(screen.getByText("Insufficient reserve")).toBeInTheDocument();
  });

  it("defaults the asset field to \"USDC\" when availableLiquidity is absent", () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} />);

    expect(screen.getByPlaceholderText("Asset")).toHaveValue("USDC");
  });

  it("defaults the asset field to \"USDC\" when availableLiquidity is empty", () => {
    const onSubmit = vi.fn();
    render(<SettlementForm onSubmit={onSubmit} availableLiquidity={{}} />);

    expect(screen.getByPlaceholderText("Asset")).toHaveValue("USDC");
  });

  it("defaults the asset field to the first available asset when USDC isn't one of the supported pools", () => {
    const onSubmit = vi.fn();
    render(
      <SettlementForm
        onSubmit={onSubmit}
        availableLiquidity={{ BTC: 500, EURT: 250 }}
      />,
    );

    // USDC is not among the available assets, so the default must be
    // one of the assets that are actually supported by this deployment.
    expect(screen.getByPlaceholderText("Asset")).toHaveValue("BTC");
  });

  it("resets the asset field to the first available asset (not the USDC literal) when USDC isn't supported", () => {
    const onSubmit = vi.fn();
    render(
      <SettlementForm
        onSubmit={onSubmit}
        availableLiquidity={{ BTC: 500, EURT: 250 }}
      />,
    );

    const assetInput = screen.getByPlaceholderText("Asset");
    // The user types a different asset code.
    fireEvent.change(assetInput, { target: { value: "EURT" } });
    expect(assetInput).toHaveValue("EURT");

    fireEvent.click(screen.getByText("Reset"));

    // Reset must restore the actually-available default, not "USDC".
    expect(assetInput).toHaveValue("BTC");
  });

  it("recomputes the asset default when availableLiquidity loads after mount, without clobbering a user edit", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<SettlementForm onSubmit={onSubmit} />);

    const assetInput = screen.getByPlaceholderText("Asset");
    // Before pools have loaded, the field still holds the "USDC" fallback.
    expect(assetInput).toHaveValue("USDC");

    // Pools finish loading; USDC isn't one of the supported assets.
    rerender(
      <SettlementForm onSubmit={onSubmit} availableLiquidity={{ BTC: 500, EURT: 250 }} />,
    );

    // Since the field still held the previous default, it is updated to
    // the newly-known available asset.
    expect(assetInput).toHaveValue("BTC");

    // Now the user edits the field manually.
    fireEvent.change(assetInput, { target: { value: "EURT" } });

    // If availableLiquidity updates again, the user's edit must not be
    // clobbered because it no longer matches the previous default.
    rerender(
      <SettlementForm
        onSubmit={onSubmit}
        availableLiquidity={{ BTC: 500, EURT: 250, XLM: 10 }}
      />,
    );
    expect(assetInput).toHaveValue("EURT");
  });
});
