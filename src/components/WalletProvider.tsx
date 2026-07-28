"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  WalletAccount,
  mockAddress,
  loadAccount,
  saveAccount,
  clearAccount,
  STORAGE_KEY,
} from "@/lib/wallet";

export interface WalletContextValue {
  account: WalletAccount | null;
  connect: () => void;
  disconnect: () => void;
}

export const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Provides a mock wallet connection to the component tree, persisted to
 * localStorage so a connected account survives a page refresh.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<WalletAccount | null>(null);

  // Loaded after mount (not as the initial state) so the client's first
  // render matches the server-rendered "disconnected" markup and avoids a
  // hydration mismatch. The read is deferred to a microtask so the update
  // happens in a callback rather than synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const stored = loadAccount();
      if (stored) setAccount(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync wallet state across browser tabs: when another tab connects or
  // disconnects, the browser fires a "storage" event that we can react to.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      // event.key is null when localStorage.clear() is called
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      setAccount(loadAccount());
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const connect = useCallback(() => {
    const next = { address: mockAddress() };
    saveAccount(next);
    setAccount(next);
  }, []);
  const disconnect = useCallback(() => {
    clearAccount();
    setAccount(null);
  }, []);

  const value = useMemo(
    () => ({ account, connect, disconnect }),
    [account, connect, disconnect],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
