"use client";
import { useState, useCallback } from "react";
import { ModuleHeader, Card, SectionLabel, Button, Badge } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer } from "@/hooks/useReviewer";
import { avg, userHashFromAlias } from "@/lib/utils/format";
import { submitCheckin, resolveCheckin } from "@/lib/eunoia/agentCoordinator";
import type { CheckinReview } from "@/types";
import { addPending, type Pending } from "@/lib/eunoia/pendingReviews";
import { usePendingReviews } from "@/hooks/usePendingReviews";
import { ASSISTANT_DISCLAIMER, detectCrisisLanguage, getSafetyResponse } from "@/lib/eunoia/safety";
import { PendingPulse } from "@/components/ui/PendingPulse";

const ACTIONS = [
  { id: "reset", title: "Generate 5-minute reset plan", template: (tone: string) =>
    `${tone === "direct" ? "Two minutes to slow down. Then three small steps:" : "A small reset for the next five minutes:"}\n- pause for five breaths\n- reduce one non-urgent task\n- protect tonight's sleep window` },
  { id: "week", title: "Summarise my week", template: () =>
    "Over the past week your signals show small, normal variability. Sleep dipped mid-week and stress climbed alongside it. Energy is recovering. Consider one steady habit you can repeat this week." },
  { id: "therapy", title: "Prepare therapy notes", template: () =>
    "Notes you can bring to a session:\n- mood and stress trend (last 4 logs)\n- sleep quality changes\n- one recurring trigger\n- one practice that helped" },
  { id: "prompt", title: "Give journaling prompt", template: () =>
    "Prompt: What is one small thing within your control this week, and what is one thing you can release?" },
  { id: "explain", title: "Explain wellness signals", template: () =>
    "Eunoia tracks mood, stress, sleep, energy, and commitment progress. These are combined into a reduced signal bundle that GenLayer reviews. Raw notes are never sent." }
];

export default function CheckinPage() {
  const { state, setState } = useStore();
  const { reviewer } = useReviewer();
  const [active, setActive] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [trigger, setTrigger] = useState<null | { tone: string; reason: string; prompt: string }>(null);
  const [crisis, setCrisis] = useState(false);

  // When the check-in verdict eventually lands (could be after a refresh),
  // re-render the active template in the verdict's tone and show the
  // tone/reason badges.
  const onResolved = useCallback((p: Pending, review: CheckinReview) => {
    const a = ACTIONS.find(x => x.id === p.meta?.actionId);
    if (a) setResponse(a.template(review.tone));
    setTrigger({ tone: review.tone, reason: review.reason, prompt: review.checkinPrompt });
    setState(s => ({ ...s, events: resolveCheckin(p.hash, review, s.events) }));
  }, [setState]);
  const pending = usePendingReviews("checkin", onResolved);
  const currentPending = pending[0]; // checkins are global, not per-target

  // The deterministic template renders immediately; the GenLayer verdict
  // refines tone + badges when it lands. Refresh-safe via pending list.
  function runAction(id: string) {
    const a = ACTIONS.find(x => x.id === id);
    if (!a) return;
    setActive(id);
    setTrigger(null);
    setResponse(a.template(state.assistantTone));
    if (!reviewer) return;
    const recent = state.moodLogs.slice(-4);
    (async () => {
      try {
        const { hash, events } = await submitCheckin(reviewer, {
          userHash: userHashFromAlias(state.alias),
          riskLevel: state.lastWellnessReview?.riskLevel ?? "WATCH",
          recentMoodAvg: avg(recent.map(l => l.mood)),
          recentStressAvg: avg(recent.map(l => l.stress)),
          missedGoals: state.commitments.filter(c => c.claimedCount < c.target).length,
          preferredTone: state.assistantTone,
          events: state.events
        });
        setState(s => ({ ...s, events }));
        addPending({ hash, startedAt: Date.now(), kind: "checkin", meta: { actionId: id } });
      } catch {
        // soft fail - template above already renders
      }
    })();
  }

  function checkCrisis(text: string) {
    if (detectCrisisLanguage(text)) { setCrisis(true); return true; }
    return false;
  }

  return (
    <div>
      <ModuleHeader section="03 / ai check-in" title="Bounded reflection" subtitle="No external AI. Outputs are built from GenLayer review verdicts and deterministic templates." />

      {crisis && (
        <Card className="mb-6 border-danger/40">
          <Badge tone="danger">crisis language detected</Badge>
          <p className="mt-3 text-sm">{getSafetyResponse()}</p>
          <Button variant="secondary" className="mt-4" onClick={() => setCrisis(false)}>Acknowledge</Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map(a => (
          <Card key={a.id} className="flex flex-col gap-3">
            <span className="section-num">{a.id}</span>
            <h3 className="font-head text-lg">{a.title}</h3>
            <Button variant={active === a.id ? "primary" : "secondary"} className="mt-auto" onClick={() => { if (!checkCrisis("")) runAction(a.id); }}>
              Run
            </Button>
          </Card>
        ))}
      </div>

      {response && (
        <Card className="mt-6">
          <SectionLabel number="06 /" label="Check-in reflection" />
          {trigger ? (
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge tone="accent">tone: {trigger.tone}</Badge>
              <Badge tone="info">{trigger.reason}</Badge>
            </div>
          ) : currentPending ? (
            <div className="mt-3">
              <PendingPulse label="GenLayer shaping the tone" since={currentPending.startedAt} />
            </div>
          ) : null}
          <pre className="whitespace-pre-wrap text-sm mt-4 font-body">{response}</pre>
          <p className="text-xs text-muted mt-4">{ASSISTANT_DISCLAIMER}</p>
        </Card>
      )}
    </div>
  );
}
