import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard label="Assets" value="12" />);
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders an optional hint", () => {
    render(
      <StatCard label="Anchor positions" value="5" hint="across all assets" />,
    );
    expect(screen.getByText("across all assets")).toBeInTheDocument();
  });

  it("omits the hint when not provided", () => {
    render(<StatCard label="Pools" value="3" />);
    expect(screen.queryByText("across all assets")).not.toBeInTheDocument();
  });

  it("shows a skeleton and keeps the label visible when loading", () => {
  render(<StatCard label="Pools" value="42" loading />);
  expect(screen.getByText("Pools")).toBeInTheDocument();
  expect(screen.queryByText("42")).not.toBeInTheDocument();
});

it("does not show a hint skeleton bleeding into loaded content", () => {
  const { container } = render(<StatCard label="Pools" value="42" hint="stable" loading />);
  expect(screen.queryByText("stable")).not.toBeInTheDocument();
  expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
});

});
