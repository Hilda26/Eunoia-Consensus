"use client";
import React from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { studionet } from "genlayer-js/chains";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export function Providers({ children }: { children: React.ReactNode }) {
  if (!APP_ID) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg text-ink p-10 text-center">
        <div>
          <h1 className="font-head text-3xl">Eunoia is not configured</h1>
          <p className="text-muted mt-3 max-w-md">Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in <code>.env.local</code> and restart the dev server.</p>
        </div>
      </div>
    );
  }
  return (
    <PrivyProvider
      appId={APP_ID}
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
      {children}
    </PrivyProvider>
  );
}
