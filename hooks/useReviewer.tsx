"use client";
import { useMemo } from "react";
import { usePrivy, useWallets, getAccessToken } from "@privy-io/react-auth";
import { makeReviewer, type Reviewer } from "@/lib/genlayer/browserClient";

// The reviewer now talks to /api/review (server-side signer). All we need
// from Privy here is "is the user logged in" and a fresh access token to
// send in the Authorization header.
export function useReviewer(): { reviewer: Reviewer | null; status: "loading" | "ready" | "no-wallet" } {
  const { ready, authenticated } = usePrivy();

  const reviewer = useMemo<Reviewer | null>(() => {
    if (!authenticated) return null;
    return makeReviewer(async () => {
      try { return await getAccessToken(); } catch { return null; }
    });
  }, [authenticated]);

  const status: "loading" | "ready" | "no-wallet" =
    !ready ? "loading" : authenticated ? "ready" : "no-wallet";

  return { reviewer, status };
}

export function useWalletAddress(): string | null {
  const { wallets } = useWallets();
  return wallets[0]?.address ?? null;
}
