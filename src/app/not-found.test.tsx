import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalletProvider } from "@/components/WalletProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound, { metadata } from "./not-found";

describe("NotFound", () => {
  it("uses an en dash in the page title", () => {
    expect(metadata.title).toBe("Page not found – AnchorNet");
  });

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
