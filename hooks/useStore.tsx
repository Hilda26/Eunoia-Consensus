"use client";
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { EunoiaState, loadState, saveState, initialState, resetState } from "@/lib/eunoia/localStore";

interface Ctx {
  state: EunoiaState;
  ready: boolean;
  setState: (updater: (s: EunoiaState) => EunoiaState) => void;
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setRaw] = useState<EunoiaState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRaw(loadState());
    setReady(true);
  }, []);

  useEffect(() => { if (ready) saveState(state); }, [state, ready]);

  const setState = useCallback((updater: (s: EunoiaState) => EunoiaState) => {
    setRaw(prev => updater(prev));
  }, []);

  const reset = useCallback(() => {
    resetState();
    setRaw(initialState);
  }, []);

  const value = useMemo(() => ({ state, ready, setState, reset }), [state, ready, setState, reset]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
