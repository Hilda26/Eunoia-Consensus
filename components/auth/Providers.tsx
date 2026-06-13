"use client";
import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { studionet } from "genlayer-js/chains";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

// Rule 1: PrivyProvider must always render. Any descendant calling Privy
// hooks (useWallets, usePrivy, ...) crashes with React #185 if we return
// before mounting the provider. If APP_ID is missing we still mount Privy
// (with a clearly-fake id) and surface a banner inside the tree instead.
export function Providers({ children }: { children: React.ReactNode }) {
  const appId = APP_ID || "missing-app-id";
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        embeddedWallets: { createOnLogin: "users-without-wallets" },
        defaultChain: studionet,
        supportedChains: [studionet],
        appearance: {
          theme: "light",
          accentColor: "#3A1628",
          walletChainType: "ethereum-only"
        }
      }}
    >
      {!APP_ID && (
        <div className="bg-aubergine text-bg text-xs px-4 py-2 text-center">
          NEXT_PUBLIC_PRIVY_APP_ID is not set. Sign-in will not work until it is configured.
        </div>
      )}
      {children}
    </PrivyProvider>
  );
}
