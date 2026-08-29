import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, describe, vi } from "vitest";
import { axe } from "jest-axe";
import { SettlementTable } from "./SettlementTable";
import { MetricsBar } from "./MetricsBar";

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        activeAnchors: 10,
        anchors: 20,
        pools: 5,
        totalLiquidity: 1000,
        settlements: 50,
        pendingSettlements: 5,
      }),
  })
) as any;

describe("Accessibility checks", () => {
  test("SettlementTable should have no a11y violations", async () => {
    const mockSettlements: any[] = [
      { id: 1, anchor: "Anchor1", asset: "USDC", amount: 100, fee: 1, status: "pending" },
    ];
    
    const { container } = render(
      <SettlementTable settlements={mockSettlements} onExecute={vi.fn()} onCancel={vi.fn()} />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("SettlementTable actionable buttons should be keyboard operable", async () => {
    const mockSettlements: any[] = [
      { id: 1, anchor: "Anchor1", asset: "USDC", amount: 100, fee: 1, status: "pending" },
    ];
    
    const onExecute = vi.fn();
    render(<SettlementTable settlements={mockSettlements} onExecute={onExecute} />);
    
    const user = userEvent.setup();
    const executeButton = screen.getAllByRole("button", { name: /execute/i })[0];
    executeButton.focus();
    expect(executeButton).toHaveFocus();
    
    await user.keyboard("{Enter}");
    expect(onExecute).toHaveBeenCalledWith(1);
  });

  test("MetricsBar should have no a11y violations", async () => {
    const { container } = render(<MetricsBar />);
    await screen.findByText(/10\/20/);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
