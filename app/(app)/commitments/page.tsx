"use client";
import { useState } from "react";
import { ModuleHeader, Card, Button, SectionLabel, Field, Badge } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer } from "@/hooks/useReviewer";
import { shortId, userHashFromAlias } from "@/lib/utils/format";
import type { Commitment, PermissionLevel } from "@/types";
import { reviewGoal } from "@/lib/eunoia/agentCoordinator";
import { makeEvent, pushEvent } from "@/lib/eunoia/eventEngine";
import { PendingPulse } from "@/components/ui/PendingPulse";

const CATEGORIES = ["meditation", "journaling", "sleep", "walking", "hydration", "therapy reminder", "breathing exercise", "support check-in", "screen-time reduction"];

export default function CommitmentsPage() {
  const { state, setState } = useStore();
  const { reviewer } = useReviewer();
  const [form, setForm] = useState({ title: "", category: "journaling", frequency: "weekly" as const, target: 3, privacy: "GENLAYER_REVIEW_ONLY" as PermissionLevel, evidenceType: "checklist" as const });
  const [evidence, setEvidence] = useState<Record<string, { summary: string; checklist: boolean }>>({});
  const [pendingReview, setPendingReview] = useState<Record<string, boolean>>({});

  function create() {
    if (!form.title.trim()) return;
    const c: Commitment = {
      id: shortId("cmt"), ts: Date.now(),
      title: form.title.trim(), category: form.category, frequency: form.frequency,
      target: form.target, privacy: form.privacy, accountability: "personal",
      evidenceType: form.evidenceType, claimedCount: 0, checklistCompleted: false
    };
    setState(s => ({
      ...s,
      commitments: [...s.commitments, c],
      events: pushEvent(s.events, makeEvent("COMMITMENT_CREATED", `created: ${c.title}`, { tone: "info" }))
    }));
    setForm({ ...form, title: "" });
  }

  // Local progress increments instantly. The GenLayer review runs in the
  // background (Studionet consensus is 30-120s) - we surface a "reviewing"
  // pill on the card and swap in the verdict when it lands.
  function submitEvidence(c: Commitment) {
    const e = evidence[c.id] || { summary: "", checklist: false };
    const newClaimed = Math.min(c.target, c.claimedCount + 1);
    setState(s => ({
      ...s,
      commitments: s.commitments.map(x => x.id === c.id ? { ...x, claimedCount: newClaimed, evidenceSummary: e.summary, checklistCompleted: e.checklist } : x),
      events: pushEvent(s.events, makeEvent("GOAL_EVIDENCE_SUBMITTED", `evidence saved for "${c.title}"`, { tone: "info" }))
    }));
    if (!reviewer) return;
    setPendingReview(p => ({ ...p, [c.id]: true }));
    (async () => {
      try {
        const { review, events } = await reviewGoal(reviewer, {
          userHash: userHashFromAlias(state.alias),
          goalTitle: c.title, goalCategory: c.category,
          targetCount: c.target, claimedCount: newClaimed,
          evidenceSummary: e.summary, checklistCompleted: e.checklist,
          events: state.events
        });
        setState(s => ({
          ...s,
          commitments: s.commitments.map(x => x.id === c.id ? { ...x, lastReview: review } : x),
          events
        }));
      } catch {
        // soft fail - progress is already saved locally
      } finally {
        setPendingReview(p => ({ ...p, [c.id]: false }));
      }
    })();
  }

  return (
    <div>
      <ModuleHeader section="04 / commitments" title="Wellness commitments" subtitle="Set gentle accountability targets. Evidence is reviewed by GenLayer without exposing private journal content." />

      <Card>
        <SectionLabel number="01 /" label="Create commitment" />
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <Field label="Title"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Journal 3 times this week" /></Field>
          <Field label="Category">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Frequency">
            <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as any })}>
              <option value="weekly">weekly</option>
              <option value="daily">daily</option>
            </select>
          </Field>
          <Field label="Target count"><input type="number" min={1} max={30} value={form.target} onChange={e => setForm({ ...form, target: Number(e.target.value) })} /></Field>
          <Field label="Privacy setting">
            <select value={form.privacy} onChange={e => setForm({ ...form, privacy: e.target.value as PermissionLevel })}>
              <option value="PRIVATE">PRIVATE</option>
              <option value="GENLAYER_REVIEW_ONLY">GENLAYER_REVIEW_ONLY</option>
              <option value="SUPPORT_CIRCLE_ALIAS">SUPPORT_CIRCLE_ALIAS</option>
              <option value="ANONYMISED_RESEARCH">ANONYMISED_RESEARCH</option>
            </select>
          </Field>
          <Field label="Evidence type">
            <select value={form.evidenceType} onChange={e => setForm({ ...form, evidenceType: e.target.value as any })}>
              <option value="checklist">checklist</option>
              <option value="text">text evidence</option>
              <option value="summary">private summary</option>
            </select>
          </Field>
        </div>
        <Button className="mt-5" onClick={create}>Create commitment</Button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        {state.commitments.map(c => {
          const e = evidence[c.id] || { summary: "", checklist: false };
          const pct = Math.round((c.claimedCount / c.target) * 100);
          return (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-head text-xl">{c.title}</h3>
                  <p className="text-xs text-muted mt-1">{c.category} · {c.frequency} · target {c.target}</p>
                </div>
                <Badge tone="accent">{c.privacy}</Badge>
              </div>
              <div className="mt-4 h-2 rounded-full bg-line overflow-hidden">
                <div className="h-full bg-aubergine" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <p className="text-xs text-muted mt-1">{c.claimedCount} / {c.target}</p>

              <div className="mt-4 grid gap-3">
                <Field label="Evidence summary (no raw journal)">
                  <textarea rows={2} value={e.summary} onChange={ev => setEvidence({ ...evidence, [c.id]: { ...e, summary: ev.target.value } })} />
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="w-auto" checked={e.checklist} onChange={ev => setEvidence({ ...evidence, [c.id]: { ...e, checklist: ev.target.checked } })} />
                  <span>Checklist completed</span>
                </label>
                <Button onClick={() => submitEvidence(c)}>Submit evidence for GenLayer review</Button>
                {pendingReview[c.id] && <PendingPulse label="GenLayer reviewing" />}
              </div>

              {c.lastReview && (
                <div className="mt-4 thin-border rounded-2xl p-4 bg-bg/50">
                  <div className="flex justify-between">
                    <Badge tone={c.lastReview.outcome === "COMPLETED" ? "ok" : c.lastReview.outcome === "MISSED" ? "warn" : "info"}>{c.lastReview.outcome}</Badge>
                    <span className="text-xs text-muted">confidence {c.lastReview.confidence}</span>
                  </div>
                  <p className="text-sm mt-2">{c.lastReview.reasoning}</p>
                  <p className="text-sm mt-2"><strong>Next step:</strong> {c.lastReview.nextStep}</p>
                </div>
              )}
            </Card>
          );
        })}
        {!state.commitments.length && <Card><p className="text-sm text-muted">No commitments yet. Create one above.</p></Card>}
      </div>
    </div>
  );
}
