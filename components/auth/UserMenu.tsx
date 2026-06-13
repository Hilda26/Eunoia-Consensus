"use client";
import React, { useState, useRef, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { LogOut, Wallet } from "lucide-react";

function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function UserMenu() {
  const { user, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!authenticated) return null;

  const wallet = wallets[0];
  const label = user?.email?.address ?? (wallet?.address ? short(wallet.address) : "signed in");

  return (
    <div className="relative ml-auto" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="chip flex items-center gap-2">
        <Wallet size={12} />
        <span className="font-mono">{label}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 thin-border bg-panel rounded-2xl p-3 shadow-sm z-30">
          {user?.email?.address && (
            <div className="text-xs text-muted mb-2 px-2">{user.email.address}</div>
          )}
          {wallet?.address && (
            <div className="text-xs font-mono text-muted mb-2 px-2 break-all">{wallet.address}</div>
          )}
          {wallet?.walletClientType && (
            <div className="text-xs text-muted mb-3 px-2">
              {wallet.walletClientType === "privy" ? "embedded wallet" : wallet.walletClientType}
            </div>
          )}
          <button onClick={logout} className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-bg flex items-center gap-2">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
