"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  EunoiaState, loadState, saveState, defaultStateFor, resetState
} from "@/lib/eunoia/localStore";

interface Ctx {
  state: EunoiaState;
  ready: boolean;
  setState: (updater: (s: EunoiaState) => EunoiaState) => void;
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: privyReady, authenticated } = usePrivy();
  const userId = authenticated ? (user?.id ?? null) : null;

  const [state, setRaw] = useState<EunoiaState>(() => defaultStateFor(userId));
  const [ready, setReady] = useState(false);
  const loadedFor = useRef<string | null>(null);

  // Load the right user's state on mount and whenever the signed-in user
  // changes. Without this, a fresh wallet sign-in would inherit the
  // previous user's alias/mood logs from the same browser.
  useEffect(() => {
    if (!privyReady) return;
    if (loadedFor.current === (userId || "anon")) return;
    setRaw(loadState(userId));
    loadedFor.current = userId || "anon";
    setReady(true);
  }, [privyReady, userId]);

  // Persist whenever state changes, scoped to the current user.
  useEffect(() => {
    if (ready) saveState(state, userId);
  }, [state, ready, userId]);

  const setState = useCallback((updater: (s: EunoiaState) => EunoiaState) => {
    setRaw(prev => updater(prev));
  }, []);

  const reset = useCallback(() => {
    resetState(userId);
    setRaw(defaultStateFor(userId));
  }, [userId]);

  const value = useMemo(() => ({ state, ready, setState, reset }), [state, ready, setState, reset]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
