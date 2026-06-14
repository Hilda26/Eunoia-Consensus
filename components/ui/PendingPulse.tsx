"use client";
import { useEffect, useState } from "react";

// Live "label · m:ss" counter shown while a GenLayer review is in flight.
// Resets to 0 on mount, so the parent just conditionally renders this when
// the call is pending and removes it when the verdict lands.
export function PendingPulse({ label }: { label: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
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
