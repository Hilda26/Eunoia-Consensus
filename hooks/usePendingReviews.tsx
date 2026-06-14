"use client";
import { useEffect, useRef, useState } from "react";
import { loadPending, removePending, type Pending, type PendingKind } from "@/lib/eunoia/pendingReviews";

type OnResolved = (p: Pending, verdict: any) => void;

// Hook every page uses to (a) read the current pending list for its kind so
// the UI can show a live counter, and (b) poll /api/tx/<hash> until each
// pending verdict lands, then call the resolver so the page can apply it.
//
// The polling resumes after refresh because the pending list is in
// localStorage - the resolver is the only thing the page brings.
export function usePendingReviews(kind: PendingKind, onResolved: OnResolved) {
  const [pending, setPending] = useState<Pending[]>(() =>
    typeof window === "undefined" ? [] : loadPending().filter(p => p.kind === kind)
  );
  const resolverRef = useRef(onResolved);
  resolverRef.current = onResolved;

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      if (cancelled) return;
      setPending(loadPending().filter(p => p.kind === kind));
    }

    async function tick() {
      const list = loadPending().filter(p => p.kind === kind);
      for (const p of list) {
        try {
          const r = await fetch(`/api/tx/${p.hash}`, { cache: "no-store" });
          if (cancelled) return;
          const j = await r.json();
          if (j?.ok && j.executionResult && /SUCCESS|ACCEPTED/i.test(j.executionResult) && j.verdict) {
            removePending(p.hash);
            resolverRef.current(p, j.verdict);
          } else if (j?.ok && j.executionResult && /ERROR|FAILED/i.test(j.executionResult)) {
            // Permanent failure - drop it so we don't poll forever.
            removePending(p.hash);
          }
        } catch {
          // network blip - just try again on the next interval
        }
      }
      if (!cancelled) refresh();
    }

    refresh();
    tick(); // immediate poll on mount so refresh-resumes catch up fast
    const interval = setInterval(tick, 5000);

    function onStorage(e: StorageEvent) {
      if (e.key === "eunoia.pending.v1") refresh();
    }
    function onLocal() { refresh(); }
    window.addEventListener("storage", onStorage);
    window.addEventListener("eunoia:pending-changed", onLocal as EventListener);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("eunoia:pending-changed", onLocal as EventListener);
    };
  }, [kind]);

  return pending;
}
