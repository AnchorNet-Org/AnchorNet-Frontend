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
import { ToastProvider } from "./ToastProvider";
import { STORAGE_KEY, mockAddress } from "@/lib/wallet";

afterEach(() => {
  localStorage.clear();
});

/** Render the button inside the required wallet + toast contexts. */
function renderButton() {
  return render(
    <WalletProvider>
      <ToastProvider>
        <ConnectButton />
      </ToastProvider>
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

  it("exposes the full wallet address in aria-label when connected", async () => {
    await connectWallet();
    // The button's accessible name must contain the full Stellar address
    // (56-character G... key) so assistive technology and automated tests
    // can discover it without relying on the truncated visible text.
    const btn = screen.getByTitle("Disconnect");
    const ariaLabel = btn.getAttribute("aria-label") ?? "";
    expect(ariaLabel).toMatch(/^Disconnect \u2013 G[A-Z0-9]{55}$/);
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

  // -------------------------------------------------------------------------
  // Toast notifications (parity with every other mutating action in the app)
  // -------------------------------------------------------------------------

  it("shows a success notification after connecting", async () => {
    await connectWallet();

    const toast = await screen.findByText("Wallet connected.");
    expect(toast).toBeInTheDocument();
    // Rendered through the shared toast viewport, so it is announced politely.
    const region = toast.closest('[role="status"]');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("shows a success notification after confirming a disconnect", async () => {
    await connectWallet();

    fireEvent.click(screen.getByTitle("Disconnect"));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Disconnect" }));

    expect(await screen.findByText("Wallet disconnected.")).toBeInTheDocument();
  });

  it("does not notify when the disconnect dialog is cancelled", async () => {
    await connectWallet();

    fireEvent.click(screen.getByTitle("Disconnect"));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /keep connected/i }),
    );

    expect(screen.queryByText("Wallet disconnected.")).not.toBeInTheDocument();
  });

  it("does not notify when the wallet state syncs from another tab", async () => {
    renderButton();

    // Another tab connected: localStorage changed and a storage event fired.
    const address = mockAddress("CROSSTAB");
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ address }));
    fireEvent(
      window,
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify({ address }),
      }),
    );

    // The button reflects the synced state...
    await waitFor(() =>
      expect(screen.getByTitle("Disconnect")).toBeInTheDocument(),
    );
    // ...but this tab's user took no action, so no toast is shown.
    expect(screen.queryByText("Wallet connected.")).not.toBeInTheDocument();

    // Same for a cross-tab disconnect.
    localStorage.removeItem(STORAGE_KEY);
    fireEvent(
      window,
      new StorageEvent("storage", { key: STORAGE_KEY, newValue: null }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /connect wallet/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText("Wallet disconnected.")).not.toBeInTheDocument();
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
