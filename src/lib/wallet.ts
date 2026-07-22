/**
 * Wallet helpers for the demo connect flow.
 *
 * This is a stand-in for a real Stellar wallet integration (e.g. Freighter):
 * it models a connected account and address formatting without signing.
 */

export interface WalletAccount {
  /** Stellar public key (G... address). */
  address: string;
}

/** localStorage key the connected account is persisted under. */
export const STORAGE_KEY = "anchornet:wallet";

/** localStorage key for the per-session random seed. */
const SEED_STORAGE_KEY = "anchornet:wallet:seed";

/** Stellar public key shape: "G" followed by 55 uppercase alphanumeric characters. */
const STELLAR_ADDRESS_PATTERN = /^G[A-Z0-9]{55}$/;

/** Persists the connected wallet account so it survives a page refresh. */
export function saveAccount(account: WalletAccount): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

/** Reads a previously persisted wallet account, if any and well-formed. */
export function loadAccount(): WalletAccount | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WalletAccount>;
    if (typeof parsed.address !== "string") return null;
    if (!STELLAR_ADDRESS_PATTERN.test(parsed.address)) return null;
    return { address: parsed.address };
  } catch {
    return null;
  }
}

/** Clears any persisted wallet account and its session seed. */
export function clearAccount(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SEED_STORAGE_KEY);
}

/** Shortens an address for display, e.g. "GABC…WXYZ". */
export function truncateAddress(address: string, visible = 4): string {
  if (address.length <= visible * 2 + 1) return address;
  return `${address.slice(0, visible)}…${address.slice(-visible)}`;
}

/**
 * Gets or generates a per-session random seed for the mock wallet.
 * The seed is persisted to localStorage so the same address is used
 * within a browser session (across reconnects/refreshes), but different
 * sessions get different seeds.
 */
function getOrGenerateSessionSeed(): string {
  if (typeof window === "undefined") return "ANCHORNET";
  
  const stored = window.localStorage.getItem(SEED_STORAGE_KEY);
  if (stored) return stored;
  
  // Generate a random seed from UUID
  const seed = crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 20);
  window.localStorage.setItem(SEED_STORAGE_KEY, seed);
  return seed;
}

/**
 * Produces a deterministic mock Stellar address from a seed.
 * If no seed is provided, uses a per-session random seed that is
 * persisted to localStorage (so it's stable within a session but
 * different across fresh sessions).
 */
export function mockAddress(seed?: string): string {
  const effectiveSeed = seed ?? getOrGenerateSessionSeed();
  const body = effectiveSeed
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .padEnd(55, "X")
    .slice(0, 55);
  return `G${body}`;
}
