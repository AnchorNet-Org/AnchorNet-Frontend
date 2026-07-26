import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PoolDistributionBar } from "./PoolDistributionBar";
import { Pool } from "@/lib/types";

const pools: Pool[] = [
  { asset: "USDC", total: 300, anchors: 2 },
  { asset: "XLM", total: 100, anchors: 5 },
];

describe("PoolDistributionBar", () => {
  it("renders an empty state when there are no pools", () => {
    render(<PoolDistributionBar pools={[]} />);
    expect(screen.getByText("No liquidity")).toBeInTheDocument();
    expect(screen.getByLabelText("No pool liquidity yet")).toBeInTheDocument();
  });

  it("renders an empty state when total liquidity is zero", () => {
    render(
      <PoolDistributionBar pools={[{ asset: "USDC", total: 0, anchors: 0 }]} />,
    );
    expect(screen.getByText("No liquidity")).toBeInTheDocument();
  });

  it("renders one bar segment per pool, sized by share of total", () => {
    const { container } = render(<PoolDistributionBar pools={pools} />);
    const rects = container.querySelectorAll("rect");
    expect(rects).toHaveLength(2);
    expect(rects[0]).toHaveAttribute("width", "75");
    expect(rects[1]).toHaveAttribute("width", "25");
  });

  it("positions each segment after the cumulative share of prior segments", () => {
    const { container } = render(<PoolDistributionBar pools={pools} />);
    const rects = container.querySelectorAll("rect");
    expect(rects[0]).toHaveAttribute("x", "0");
    expect(rects[1]).toHaveAttribute("x", "75");
  });

  it("shows a percentage legend for each asset", () => {
    render(<PoolDistributionBar pools={pools} />);
    expect(screen.getByRole("button", { name: /USDC · 75.0%/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /XLM · 25.0%/i })).toBeInTheDocument();
  });

  it("makes legend entries keyboard-focusable buttons", () => {
    render(<PoolDistributionBar pools={pools} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("USDC · 75.0%");
    expect(buttons[1]).toHaveTextContent("XLM · 25.0%");
  });

  it("applies the highlighted state to the corresponding segment when focused or hovered", () => {
    const { container } = render(<PoolDistributionBar pools={pools} />);
    const buttons = screen.getAllByRole("button");
    const rects = container.querySelectorAll("rect");

    // Initially, nothing should be highlighted (data-highlighted is false)
    expect(rects[0]).toHaveAttribute("data-highlighted", "false");
    expect(rects[1]).toHaveAttribute("data-highlighted", "false");
    expect(rects[0].style.opacity).not.toBe("0.4");
    expect(rects[1].style.opacity).not.toBe("0.4");

    // Focus first legend entry
    fireEvent.focus(buttons[0]);
    expect(rects[0]).toHaveAttribute("data-highlighted", "true");
    expect(rects[1]).toHaveAttribute("data-highlighted", "false");
    expect(rects[0].style.opacity).toBe("1");
    expect(rects[1].style.opacity).toBe("0.4");

    // Blur first legend entry
    fireEvent.blur(buttons[0]);
    expect(rects[0]).toHaveAttribute("data-highlighted", "false");
    expect(rects[1]).toHaveAttribute("data-highlighted", "false");

    // Hover second legend entry
    fireEvent.mouseEnter(buttons[1]);
    expect(rects[0]).toHaveAttribute("data-highlighted", "false");
    expect(rects[1]).toHaveAttribute("data-highlighted", "true");
    expect(rects[0].style.opacity).toBe("0.4");
    expect(rects[1].style.opacity).toBe("1");

    // Mouse leave second legend entry
    fireEvent.mouseLeave(buttons[1]);
    expect(rects[0]).toHaveAttribute("data-highlighted", "false");
    expect(rects[1]).toHaveAttribute("data-highlighted", "false");
  });

  it("assigns distinct colors when there are more than 6 pools", () => {
    const manyPools: Pool[] = Array.from({ length: 8 }, (_, i) => ({
      asset: `Asset${i}`,
      total: 100,
      anchors: 1,
    }));
    const { container } = render(<PoolDistributionBar pools={manyPools} />);
    const rects = container.querySelectorAll("rect");
    const fills = Array.from(rects).map((r) => r.getAttribute("fill"));
    const uniqueFills = new Set(fills);
    expect(uniqueFills.size).toBe(fills.length);
  });
});
