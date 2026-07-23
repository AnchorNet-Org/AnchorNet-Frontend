import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders a default label", () => {
    render(<Spinner />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders a custom label", () => {
    render(<Spinner label="Loading anchor…" />);
    expect(screen.getByText("Loading anchor…")).toBeInTheDocument();
  });

  it("includes the motion-reduce class to disable spin animation", () => {
    const { container } = render(<Spinner />);
    const span = container.querySelector("span[aria-hidden]");
    expect(span).toHaveClass("motion-reduce:animate-none");
  });
});
