"use client";
import { useState, useCallback } from "react";
import { ModuleHeader, Card, SectionLabel, Badge, Button } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer } from "@/hooks/useReviewer";
import { avg } from "@/lib/utils/format";
import { riskTone } from "@/lib/genlayer/consensusMapper";
import { submitWellness, resolveWellness } from "@/lib/eunoia/agentCoordinator";
import type { WellnessReview } from "@/types";
import { addPending, type Pending } from "@/lib/eunoia/pendingReviews";
import { usePendingReviews } from "@/hooks/usePendingReviews";
import { PendingPulse } from "@/components/ui/PendingPulse";

const RECOMMENDED = ["5-minute breathing reset", "protect sleep window", "reduce one non-urgent task", "message support circle", "prepare therapy notes"];

export default function RiskPage() {
  const { state, setState } = useStore();
  const { reviewer } = useReviewer();
  const [error, setError] = useState<string | null>(null);
  const recent = state.moodLogs.slice(-4);
  const moodAvg = avg(recent.map(l => l.mood));
  const stressAvg = avg(recent.map(l => l.stress));
  const sleepAvg = avg(recent.map(l => l.sleep));
  const energyAvg = avg(recent.map(l => l.energy));
  const review = state.lastWellnessReview;

  // Wellness pending reviews surface here too - same kind as Mood Signals,
  // so the indicator updates when the verdict lands no matter which tab
  // the user submitted from or whether they refreshed in between.
  const onResolved = useCallback((p: Pending, verdict: WellnessReview) => {
    setState(s => ({
      ...s,
      lastWellnessReview: verdict,
      events: resolveWellness(p.hash, verdict, s.events)
    }));
  }, [setState]);
  const pending = usePendingReviews("wellness", onResolved);
  const refreshing = pending[0];

  function refresh() {
    setError(null);
    if (!reviewer) { setError("Not signed in - reload the page and sign in."); return; }
    if (!state.moodLogs.length) { setError("Log a mood entry first - the indicator needs at least one signal."); return; }
    (async () => {
      try {
        const { hash, events } = await submitWellness(reviewer, { alias: state.alias, logs: state.moodLogs, commitments: state.commitments, permissions: state.permissions, events: state.events });
        setState(s => ({ ...s, events }));
        addPending({ hash, startedAt: Date.now(), kind: "wellness" });
      } catch {
        setError("Could not start the review this time. Your latest signals are safe on this device.");
      }
    })();
  }

  return (
    <div>
      <ModuleHeader section="08 / wellness risk indicator" title="Your wellness risk indicator" subtitle="A non-medical summary based on recent signals. Never a diagnosis, never a label about you." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionLabel number="01 /" label="Current level" />
          <div className="mt-4 flex flex-col items-start gap-3">
            <span className="font-head text-6xl">{review?.riskLevel ?? "STEADY"}</span>
            <Badge tone={riskTone(review?.riskLevel ?? "STEADY")}>score {review?.score ?? 0}</Badge>
            <p className="text-xs text-muted">Your wellness risk indicator is {review?.riskLevel?.toLowerCase() ?? "steady"}.</p>
            <Button onClick={refresh}>Refresh from latest signals</Button>
            {refreshing && <PendingPulse label="Refreshing your indicator" since={refreshing.startedAt} />}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionLabel number="02 /" label="Signal breakdown" />
          <div className="grid gap-3 sm:grid-cols-2 mt-4">
            {[["mood", moodAvg], ["stress", stressAvg], ["sleep", sleepAvg], ["energy", energyAvg]].map(([k, v]) => (
              <div key={k as string} className="thin-border rounded-2xl p-4 bg-bg/50">
                <div className="flex justify-between">
                  <span className="capitalize">{k as string}</span>
                  <span className="font-mono text-sm">{(v as number).toFixed(1)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-line overflow-hidden">
                  <div className="h-full bg-aubergine" style={{ width: `${Math.min(100, (v as number) * 10)}%` }} />
                </div>
              </div>
            ))}
          </div>
          {review?.signals.length ? (
            <ul className="mt-5 list-disc pl-5 text-sm">{review.signals.map((s, i) => <li key={i}>{s}</li>)}</ul>
          ) : null}
        </Card>
      </div>

      <Card className="mt-6">
        <SectionLabel number="03 /" label="Recommended actions" />
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(review?.recommendedActions ?? RECOMMENDED).map(a => (
            <li key={a} className="thin-border rounded-2xl p-3 bg-bg/50 text-sm">{a}</li>
          ))}
        </ul>
        <p className="text-xs text-muted mt-4">This is not a medical diagnosis. Eunoia is not therapy or crisis support.</p>
      </Card>
    </div>
  );
}
