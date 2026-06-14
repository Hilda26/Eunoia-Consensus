"use client";
import { useEffect, useState } from "react";

// Live "label · m:ss" counter shown while a GenLayer review is in flight.
// Pass `since` (ms epoch) when the pending review was first submitted so the
// counter resumes from the real elapsed time after a page refresh.
export function PendingPulse({ label, since }: { label: string; since?: number }) {
  const start = since ?? Date.now();
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.floor((Date.now() - start) / 1000)));
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [start]);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <span className="text-xs text-muted inline-flex items-center gap-2">
      <span className="inline-block h-2 w-2 rounded-full bg-clay animate-pulse" />
      <span>{label}</span>
      <span className="tabular-nums text-ink/60">{mm}:{ss}</span>
    </span>
  );
}
