// Helpers for linking out to the GenLayer Studionet block explorer.
//
// Confirmed from `genlayer-js`'s studionet chain definition:
//   blockExplorers.default.url = "https://genlayer-explorer.vercel.app"
// The Studio at studio.genlayer.com is the IDE/playground, not the
// transaction explorer.

const EXPLORER_BASE = "https://genlayer-explorer.vercel.app";

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_BASE}/address/${address}`;
}

export function shortHash(hash: string): string {
  if (!hash) return "";
  const h = hash.startsWith("0x") ? hash : `0x${hash}`;
  return `${h.slice(0, 8)}...${h.slice(-6)}`;
}
