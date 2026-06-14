"use client";
import { useState } from "react";
import { ModuleHeader, Card, Button, SectionLabel, Field, Badge } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer } from "@/hooks/useReviewer";
import { shortId } from "@/lib/utils/format";
import type { MoodLog } from "@/types";
import { makeEvent, pushEvent } from "@/lib/eunoia/eventEngine";
import { reviewWellness } from "@/lib/eunoia/agentCoordinator";
import { detectCrisisLanguage, getSafetyResponse } from "@/lib/eunoia/safety";
import { riskTone } from "@/lib/genlayer/consensusMapper";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { PendingPulse } from "@/components/ui/PendingPulse";

const TAGS = ["work", "school", "family", "money", "relationships", "health", "burnout", "sleep", "loneliness", "overthinking", "recovery"];

export default function MoodPage() {
  const { state, setState } = useStore();
  const { reviewer } = useReviewer();
  const [form, setForm] = useState({ mood: 6, stress: 5, anxiety: 4, energy: 6, sleep: 6, note: "", tags: [] as string[] });
  const [crisis, setCrisis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [reviewPending, setReviewPending] = useState(false);
  const [lastReview, setLastReview] = useState(state.lastWellnessReview ?? null);

  function toggleTag(t: string) {
    setForm(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t] }));
  }

  // The local save is instant; the GenLayer review is kicked off in the
  // background because Studionet consensus takes 30-120s and blocking the
  // form on it makes the UI feel broken. Submitting again while a prior
  // review is still in flight is fine - the local log saves immediately
  // and the latest verdict to land wins.
  function submit() {
    if (detectCrisisLanguage(form.note)) { setCrisis(true); return; }
    setError(null);
    const log: MoodLog = { id: shortId("mood"), ts: Date.now(), ...form };
    const logs = [...state.moodLogs, log];
    const events = pushEvent(state.events, makeEvent("MOOD_SIGNAL_CREATED", "local private signal saved", { tone: "info" }));
    setState(s => ({ ...s, moodLogs: logs, events }));
    setForm({ mood: 6, stress: 5, anxiety: 4, energy: 6, sleep: 6, note: "", tags: [] });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);

    if (!reviewer) {
      setError("Not signed in. Your log was saved on this device.");
      return;
    }
    setReviewPending(true);
    (async () => {
      try {
        const { review, events: ev2 } = await reviewWellness(reviewer, { alias: state.alias, logs, commitments: state.commitments, permissions: state.permissions, events });
        setLastReview(review);
        setState(s => ({ ...s, lastWellnessReview: review, events: ev2 }));
      } catch (e: any) {
        setError("Reflection could not be generated this time. Your log is safe on this device.");
      } finally {
        setReviewPending(false);
      }
    })();
  }

  const chartData = state.moodLogs.slice(-12).map((l, i) => ({ i: i + 1, mood: l.mood, stress: l.stress, sleep: l.sleep, energy: l.energy }));

  return (
    <div>
      <ModuleHeader section="02 / mood signals" title="Log a wellness signal" subtitle="Your private note stays on this device. Only a small, non-identifying summary is shared for review." />

      {crisis && (
        <Card className="mb-6 border-danger/40">
          <Badge tone="danger">a quick safety check</Badge>
          <p className="mt-3 text-sm">{getSafetyResponse()}</p>
          <Button variant="secondary" className="mt-4" onClick={() => setCrisis(false)}>Acknowledge</Button>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionLabel number="01 /" label="How are you today" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(["mood", "stress", "anxiety", "energy", "sleep"] as const).map(k => (
              <Field key={k} label={`${k} (1-10)`}>
                <input type="number" min={1} max={10} value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: Number(e.target.value) })} />
              </Field>
            ))}
            <Field label="Private note (stays on this device)">
              <textarea rows={3} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="A short note for you only." />
            </Field>
          </div>
          <div className="mt-4">
            <div className="section-num mb-2">Tags</div>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(t => (
                <button key={t} onClick={() => toggleTag(t)} className={`chip ${form.tags.includes(t) ? "bg-aubergine text-bg border-aubergine" : ""}`}>{t}</button>
              ))}
            </div>
          </div>
          <Button className="mt-6" onClick={submit}>Save and reflect</Button>
          {savedFlash && <p className="text-xs text-sage mt-3">Saved. Reflection is being prepared in the background.</p>}
          {error && <p className="text-xs text-danger mt-3">{error}</p>}
        </Card>

        <Card>
          <SectionLabel number="02 /" label="Latest reflection" />
          {reviewPending && (
            <div className="mt-3">
              <PendingPulse label="Reflecting on your signals" />
              <p className="text-xs text-muted mt-1">Usually ~1 minute. You can keep using the app.</p>
            </div>
          )}
          {lastReview ? (
            <div className="mt-3">
              <div className="flex justify-between items-center">
                <Badge tone={riskTone(lastReview.riskLevel)}>{lastReview.riskLevel}</Badge>
                <span className="text-xs text-muted">a gentle reflection</span>
              </div>
              <ul className="list-disc pl-5 mt-3 text-sm">{lastReview.signals.map((s, i) => <li key={i}>{s}</li>)}</ul>
              {lastReview.recommendedActions?.length > 0 && (
                <div className="mt-4">
                  <p className="section-num mb-2">A small next step</p>
                  <ul className="list-disc pl-5 text-sm">{lastReview.recommendedActions.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              <p className="text-xs text-muted mt-4">{lastReview.safetyNote}</p>
            </div>
          ) : <p className="text-sm text-muted mt-3">Your reflection will appear here after your first entry.</p>}
        </Card>
      </div>

      <Card className="mt-6">
        <SectionLabel number="03 /" label="Trends" />
        <div className="h-64 mt-4">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="i" hide />
              <YAxis domain={[0, 10]} hide />
              <Tooltip />
              <Line type="monotone" dataKey="mood" stroke="#3A1628" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="stress" stroke="#B76E58" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="sleep" stroke="#9DB8A2" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="energy" stroke="#CBDDE7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 text-xs mt-2 flex-wrap">
          <span><span className="inline-block w-3 h-1.5 bg-aubergine mr-2 align-middle" />mood</span>
          <span><span className="inline-block w-3 h-1.5 bg-clay mr-2 align-middle" />stress</span>
          <span><span className="inline-block w-3 h-1.5 bg-sage mr-2 align-middle" />sleep</span>
          <span><span className="inline-block w-3 h-1.5 bg-powder mr-2 align-middle" />energy</span>
        </div>
      </Card>
    </div>
  );
}
