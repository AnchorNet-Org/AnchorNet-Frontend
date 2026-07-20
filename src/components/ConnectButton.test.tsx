import { describe, it, expect, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { ConnectButton } from "./ConnectButton";
import { WalletProvider } from "./WalletProvider";

afterEach(() => {
  localStorage.clear();
});

/** Render the button inside the required wallet context. */
function renderButton() {
  return render(
    <WalletProvider>
      <ConnectButton />
    </WalletProvider>,
  );
}

/** Helper: render, then click "Connect wallet" and wait for the address button. */
async function connectWallet() {
  renderButton();
  fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
  await waitFor(() => screen.getByTitle("Disconnect"));
}

describe("ConnectButton", () => {
  it("shows a connect prompt when disconnected", () => {
    renderButton();
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });

  it("shows a truncated address once connected", async () => {
    await connectWallet();
    expect(screen.getByTitle("Disconnect")).toBeInTheDocument();
    expect(screen.getByTitle("Disconnect").textContent).toMatch(/…/);
  });

  // -------------------------------------------------------------------------
  // Disconnect confirmation flow
  // -------------------------------------------------------------------------

  it("opens the confirmation dialog when the address button is clicked", async () => {
    await connectWallet();

    fireEvent.click(screen.getByTitle("Disconnect"));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/disconnect your wallet/i),
    ).toBeInTheDocument();
  });

  it("does not disconnect immediately when the address button is clicked", async () => {
    await connectWallet();

    fireEvent.click(screen.getByTitle("Disconnect"));

    // The connect prompt must NOT be visible yet — session still active.
    expect(
      screen.queryByRole("button", { name: /connect wallet/i }),
    ).not.toBeInTheDocument();
    // Address button is still present (behind the overlay).
    expect(screen.getByTitle("Disconnect")).toBeInTheDocument();
  });

  it("disconnects when the user confirms in the dialog", async () => {
    await connectWallet();

    fireEvent.click(screen.getByTitle("Disconnect"));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Disconnect" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /connect wallet/i }),
      ).toBeInTheDocument();
    });
    // Dialog should be gone after confirming.
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the wallet connected when the user cancels the dialog", async () => {
    await connectWallet();

    fireEvent.click(screen.getByTitle("Disconnect"));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /keep connected/i }),
    );

    // Dialog dismissed but wallet still connected.
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByTitle("Disconnect")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /connect wallet/i }),
    ).not.toBeInTheDocument();
  });

  it("closes the dialog on Escape without disconnecting", async () => {
    await connectWallet();

    fireEvent.click(screen.getByTitle("Disconnect"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    // Wallet still connected.
    expect(screen.getByTitle("Disconnect")).toBeInTheDocument();
  });

  it("autofocuses the cancel button when the dialog opens", async () => {
    await connectWallet();

    fireEvent.click(screen.getByTitle("Disconnect"));
    const dialog = screen.getByRole("alertdialog");

    expect(document.activeElement).toBe(
      within(dialog).getByRole("button", { name: /keep connected/i }),
    );
  });
});
