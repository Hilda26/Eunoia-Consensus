"use client";
import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { makeReviewer, type Reviewer } from "@/lib/genlayer/browserClient";

export function useReviewer(): { reviewer: Reviewer | null; status: "loading" | "ready" | "no-wallet" } {
  const { ready, authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [reviewer, setReviewer] = useState<Reviewer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "no-wallet">("loading");

  useEffect(() => {
    if (!ready || !walletsReady) { setStatus("loading"); return; }
    if (!authenticated) { setReviewer(null); setStatus("no-wallet"); return; }
    const wallet = wallets[0];
    if (!wallet) { setReviewer(null); setStatus("no-wallet"); return; }
    let cancelled = false;
    (async () => {
      try {
        const provider = await wallet.getEthereumProvider();
        if (cancelled) return;
        setReviewer(makeReviewer(provider as any));
        setStatus("ready");
      } catch (e) {
        console.warn("[useReviewer] failed to init", e);
        if (!cancelled) { setReviewer(null); setStatus("no-wallet"); }
      }
    })();
    return () => { cancelled = true; };
  }, [ready, walletsReady, authenticated, wallets]);

  return { reviewer, status };
}

export function useWalletAddress(): string | null {
  const { wallets } = useWallets();
  return wallets[0]?.address ?? null;
}
