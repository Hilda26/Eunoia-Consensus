// Helpers for linking out to the GenLayer Studio explorer.

const STUDIO_BASE = "https://studio.genlayer.com";

export function explorerTxUrl(hash: string): string {
  return `${STUDIO_BASE}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${STUDIO_BASE}/address/${address}`;
}

export function shortHash(hash: string): string {
  if (!hash) return "";
  const h = hash.startsWith("0x") ? hash : `0x${hash}`;
  return `${h.slice(0, 8)}...${h.slice(-6)}`;
}
