"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { truncateAddress } from "@/lib/wallet";
import { ConfirmDialog } from "./ConfirmDialog";

/** Header button that connects or disconnects the mock wallet. */
export function ConnectButton() {
  const { account, connect, disconnect } = useWallet();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (account) {
    return (
      <>
        <button
          onClick={() => setConfirmOpen(true)}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
          title="Disconnect"
          aria-label={`Disconnect \u2013 ${account.address}`}
        >
          {truncateAddress(account.address)}
        </button>
        {/* Guard the destructive disconnect behind a confirmation step,
            matching the keyboard-accessible pattern used by the anchor
            deactivate and settlement cancel dialogs. */}
        <ConfirmDialog
          open={confirmOpen}
          title="Disconnect wallet"
          message="Disconnect your wallet? Your session will be cleared."
          confirmLabel="Disconnect"
          cancelLabel="Keep connected"
          onConfirm={() => {
            setConfirmOpen(false);
            disconnect();
          }}
          onCancel={() => setConfirmOpen(false)}
        />
      </>
    );
  }

  return (
    <button
      onClick={connect}
      className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white"
    >
      Connect wallet
    </button>
  );
}
