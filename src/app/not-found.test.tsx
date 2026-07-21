import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalletProvider } from "@/components/WalletProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("renders a 404 message with a link back home", () => {
    render(
      <WalletProvider>
        <ThemeProvider>
          <NotFound />
        </ThemeProvider>
      </WalletProvider>,
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to home/i }),
    ).toHaveAttribute("href", "/");
  });
});
