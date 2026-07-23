import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WalletProvider } from "./WalletProvider";
import { useWallet } from "@/hooks/useWallet";

function WalletStatus() {
  const { account, connect, disconnect } = useWallet();
  return (
    <div>
      <span>{account ? account.address : "disconnected"}</span>
      <button onClick={connect}>connect</button>
      <button onClick={disconnect}>disconnect</button>
    </div>
  );
}

afterEach(() => {
  localStorage.clear();
});

describe("WalletProvider", () => {
  it("starts disconnected", () => {
    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );
    expect(screen.getByText("disconnected")).toBeInTheDocument();
  });

  it("connects and persists the account to localStorage", async () => {
    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );

    fireEvent.click(screen.getByText("connect"));

    await waitFor(() => {
      expect(screen.queryByText("disconnected")).not.toBeInTheDocument();
    });
    expect(localStorage.getItem("anchornet:wallet")).not.toBeNull();
  });

  it("disconnects and clears the persisted account", async () => {
    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );

    fireEvent.click(screen.getByText("connect"));
    await waitFor(() => {
      expect(screen.queryByText("disconnected")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("disconnect"));
    expect(screen.getByText("disconnected")).toBeInTheDocument();
    expect(localStorage.getItem("anchornet:wallet")).toBeNull();
  });

  it("is a harmless no-op when disconnect is called while already disconnected", () => {
    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );

    // Starts disconnected; no connect() has run.
    expect(screen.getByText("disconnected")).toBeInTheDocument();

    // A stray double-fire (e.g. a second click, or a race with cross-tab
    // sync) must not throw and must leave the account null.
    expect(() =>
      fireEvent.click(screen.getByText("disconnect")),
    ).not.toThrow();
    expect(() =>
      fireEvent.click(screen.getByText("disconnect")),
    ).not.toThrow();

    expect(screen.getByText("disconnected")).toBeInTheDocument();
    expect(localStorage.getItem("anchornet:wallet")).toBeNull();
  });

  it("restores a previously connected account on mount", async () => {
    localStorage.setItem(
      "anchornet:wallet",
      JSON.stringify({ address: "G" + "A".repeat(55) }),
    );

    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText("disconnected")).not.toBeInTheDocument();
    });
  });

  it("syncs a connect from another tab via a storage event", async () => {
    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );
    expect(screen.getByText("disconnected")).toBeInTheDocument();

    // Simulate another tab writing the wallet key to localStorage
    const address = "G" + "B".repeat(55);
    localStorage.setItem("anchornet:wallet", JSON.stringify({ address }));
    fireEvent(
      window,
      new StorageEvent("storage", {
        key: "anchornet:wallet",
        newValue: JSON.stringify({ address }),
        storageArea: localStorage,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(address)).toBeInTheDocument();
    });
  });

  it("syncs a disconnect from another tab via a storage event", async () => {
    const address = "G" + "C".repeat(55);
    localStorage.setItem("anchornet:wallet", JSON.stringify({ address }));

    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );

    // Wait for the initial mount load to settle
    await waitFor(() => {
      expect(screen.queryByText("disconnected")).not.toBeInTheDocument();
    });

    // Simulate another tab removing the wallet key
    localStorage.removeItem("anchornet:wallet");
    fireEvent(
      window,
      new StorageEvent("storage", {
        key: "anchornet:wallet",
        newValue: null,
        storageArea: localStorage,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("disconnected")).toBeInTheDocument();
    });
  });

  it("ignores storage events for unrelated keys", async () => {
    const address = "G" + "D".repeat(55);
    localStorage.setItem("anchornet:wallet", JSON.stringify({ address }));

    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText("disconnected")).not.toBeInTheDocument();
    });

    // Fire a storage event for an unrelated key — state must not change
    fireEvent(
      window,
      new StorageEvent("storage", {
        key: "some-other-key",
        newValue: "irrelevant",
        storageArea: localStorage,
      }),
    );

    // Account should still be shown (not reset to disconnected)
    expect(screen.queryByText("disconnected")).not.toBeInTheDocument();
    expect(screen.getByText(address)).toBeInTheDocument();
  });

  it("connects in-memory even if localStorage.setItem throws", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );

    fireEvent.click(screen.getByText("connect"));

    await waitFor(() => {
      expect(screen.queryByText("disconnected")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/G[A-Z0-9]{55}/)).toBeInTheDocument();
  });

  it("disconnects in-memory even if localStorage.removeItem throws", async () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );

    fireEvent.click(screen.getByText("connect"));
    await waitFor(() => {
      expect(screen.queryByText("disconnected")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("disconnect"));
    expect(screen.getByText("disconnected")).toBeInTheDocument();
  });

  it("handles unmount before initial load completes", async () => {
    const { unmount } = render(
      <WalletProvider>
        <WalletStatus />
      </WalletProvider>,
    );
    unmount();
    // Wait a tick to ensure the microtask runs
    await Promise.resolve();
  });
});
