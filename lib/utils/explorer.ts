// In-app transaction view URLs.
//
// GenLayer's external Studionet explorers are currently down
// (genlayer-explorer.vercel.app: 503 DEPLOYMENT_PAUSED, explorer.genlayer.com:
// 521). Rather than ship dead links, the activity feed points at an
// internal /tx/<hash> page that reads the receipt directly from Studionet
// via /api/tx/<hash>. This always works as long as the chain is up.

export function explorerTxUrl(hash: string): string {
  return `/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `/tx/${address}`;
}

export function shortHash(hash: string): string {
  if (!hash) return "";
  const h = hash.startsWith("0x") ? hash : `0x${hash}`;
  return `${h.slice(0, 8)}...${h.slice(-6)}`;
}
