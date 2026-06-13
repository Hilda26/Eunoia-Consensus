"use client";
import { useState } from "react";
import { ModuleHeader, Card, SectionLabel, Button, Badge } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer } from "@/hooks/useReviewer";
import { avg, userHashFromAlias } from "@/lib/utils/format";
import { reviewCheckin } from "@/lib/eunoia/agentCoordinator";
import { ASSISTANT_DISCLAIMER, detectCrisisLanguage, getSafetyResponse } from "@/lib/eunoia/safety";

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
  const { state } = useStore();
  const { reviewer } = useReviewer();
  const [active, setActive] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [trigger, setTrigger] = useState<null | { tone: string; reason: string; prompt: string }>(null);
  const [busy, setBusy] = useState(false);
  const [crisis, setCrisis] = useState(false);

  async function runAction(id: string) {
    const a = ACTIONS.find(x => x.id === id);
    if (!a) return;
    setActive(id);
    setBusy(true);
    const recent = state.moodLogs.slice(-4);
    if (!reviewer) { setBusy(false); return; }
    const r = await reviewCheckin(reviewer, {
      userHash: userHashFromAlias(state.alias),
      riskLevel: state.lastWellnessReview?.riskLevel ?? "WATCH",
      recentMoodAvg: avg(recent.map(l => l.mood)),
      recentStressAvg: avg(recent.map(l => l.stress)),
      missedGoals: state.commitments.filter(c => c.claimedCount < c.target).length,
      preferredTone: state.assistantTone,
      events: state.events
    });
    setTrigger({ tone: r.review.tone, reason: r.review.reason, prompt: r.review.checkinPrompt });
    setResponse(a.template(r.review.tone));
    setBusy(false);
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
            <Button variant={active === a.id ? "primary" : "secondary"} className="mt-auto" onClick={() => { if (!checkCrisis("")) runAction(a.id); }} disabled={busy}>
              {busy && active === a.id ? "Reviewing..." : "Run"}
            </Button>
          </Card>
        ))}
      </div>

      {response && (
        <Card className="mt-6">
          <SectionLabel number="06 /" label="Check-in reflection" />
          {trigger && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge tone="accent">tone: {trigger.tone}</Badge>
              <Badge tone="info">{trigger.reason}</Badge>
            </div>
          )}
          <pre className="whitespace-pre-wrap text-sm mt-4 font-body">{response}</pre>
          <p className="text-xs text-muted mt-4">{ASSISTANT_DISCLAIMER}</p>
        </Card>
      )}
    </div>
  );
}
