"use client";
import React from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button, Card } from "@/components/ui/Primitives";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg text-muted text-sm">
        Loading...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg text-ink px-6">
        <Card className="max-w-md w-full text-center">
          <span className="section-num">welcome to eunoia</span>
          <h1 className="font-head text-3xl mt-2">A quiet space, just for you</h1>
          <p className="text-muted text-sm mt-3">
            Sign in with email or a wallet to begin. Your private notes stay on this device.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={login}>Sign in</Button>
          </div>
          <p className="text-xs text-muted mt-6">
            Eunoia is a wellness companion. It is not medical care, therapy, or crisis support.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
