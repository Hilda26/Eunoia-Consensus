"use client";
import { useState, useCallback } from "react";
import { ModuleHeader, Card, SectionLabel, Button, Field, Badge } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer } from "@/hooks/useReviewer";
import { shortId } from "@/lib/utils/format";
import type { ConsentRequest, ConsentReview } from "@/types";
import { submitConsent, resolveConsent } from "@/lib/eunoia/agentCoordinator";
import { addPending, type Pending } from "@/lib/eunoia/pendingReviews";
import { usePendingReviews } from "@/hooks/usePendingReviews";
import { PendingPulse } from "@/components/ui/PendingPulse";

const ALLOWED_FIELDS = ["sleep score range", "stress score range", "mood score range", "energy score range", "goal completion count", "tag frequencies"];
const NEVER_FIELDS = ["journal text", "name", "email", "exact location", "therapy notes", "medical records"];

export default function ResearchPage() {
  const { state, setState } = useStore();
  const { reviewer } = useReviewer();
  const [form, setForm] = useState({ title: "", requestingEntity: "Not connected", durationDays: 30, dataRequested: [] as string[], revocable: true });
  const [formError, setFormError] = useState<string | null>(null);

  const onResolved = useCallback((p: Pending, review: ConsentReview) => {
    setState(s => ({
      ...s,
      consents: s.consents.map(c => c.id === p.targetId ? { ...c, review, active: review.status === "CLEAR" } : c),
      events: resolveConsent(p.hash, review, s.events)
    }));
  }, [setState]);
  const pending = usePendingReviews("consent", onResolved);
  const pendingByConsent: Record<string, Pending> = {};
  for (const p of pending) if (p.targetId) pendingByConsent[p.targetId] = p;

  function toggleField(f: string) {
    setForm(s => ({ ...s, dataRequested: s.dataRequested.includes(f) ? s.dataRequested.filter(x => x !== f) : [...s.dataRequested, f] }));
  }

  function submit() {
    setFormError(null);
    if (!form.title.trim()) { setFormError("Add a title for this request."); return; }
    if (!form.dataRequested.length) { setFormError("Pick at least one data field to request."); return; }
    if (!reviewer) { setFormError("Not signed in - reload the page and sign in."); return; }
    const snapshot = { ...form };
    const req: ConsentRequest = {
      id: shortId("cns"), ts: Date.now(),
      title: snapshot.title, requestingEntity: snapshot.requestingEntity,
      dataRequested: snapshot.dataRequested, dataNotRequested: NEVER_FIELDS,
      durationDays: snapshot.durationDays, revocable: snapshot.revocable,
      active: false
    };
    setState(s => ({ ...s, consents: [req, ...s.consents] }));
    setForm({ title: "", requestingEntity: "Not connected", durationDays: 30, dataRequested: [], revocable: true });
    (async () => {
      try {
        const { hash, events } = await submitConsent(reviewer, {
          title: snapshot.title, requestingEntity: snapshot.requestingEntity,
          dataRequested: snapshot.dataRequested, dataNotRequested: NEVER_FIELDS,
          durationDays: snapshot.durationDays, revocable: snapshot.revocable,
          events: state.events
        });
        setState(s => ({ ...s, events }));
        addPending({ hash, startedAt: Date.now(), kind: "consent", targetId: req.id });
      } catch {
        // soft fail - request stays in pending state
      }
    })();
  }

  function revoke(id: string) {
    setState(s => ({ ...s, consents: s.consents.map(c => c.id === id ? { ...c, active: false } : c) }));
  }

  return (
    <div>
      <ModuleHeader section="07 / research consent" title="Consent Request Builder" subtitle="Build a consent request and let GenLayer review its clarity and privacy risk. No fake institutions." />

      <Card>
        <SectionLabel number="01 /" label="Build a request" />
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <Field label="Title"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Sleep and Stress Pattern Review" /></Field>
          <Field label="Requesting entity"><input value={form.requestingEntity} onChange={e => setForm({ ...form, requestingEntity: e.target.value })} /></Field>
          <Field label="Duration (days)"><input type="number" min={1} max={365} value={form.durationDays} onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })} /></Field>
          <Field label="Revocable">
            <select value={String(form.revocable)} onChange={e => setForm({ ...form, revocable: e.target.value === "true" })}>
              <option value="true">yes</option><option value="false">no</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <div className="section-num mb-2">Data requested</div>
          <div className="flex flex-wrap gap-2">
            {ALLOWED_FIELDS.map(f => (
              <button key={f} className={`chip ${form.dataRequested.includes(f) ? "bg-aubergine text-bg border-aubergine" : ""}`} onClick={() => toggleField(f)}>{f}</button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <div className="section-num mb-2">Never requested</div>
          <div className="flex flex-wrap gap-2">{NEVER_FIELDS.map(f => <Badge key={f} tone="ok">{f}</Badge>)}</div>
        </div>
        <Button className="mt-6" onClick={submit}>Run consent review</Button>
        {formError && <p className="text-xs text-danger mt-3">{formError}</p>}
      </Card>

      <Card className="mt-6">
        <SectionLabel number="08 /" label="Consent history" />
        <div className="grid gap-3 mt-4">
          {state.consents.map(c => (
            <div key={c.id} className="thin-border rounded-2xl p-4 bg-bg/50">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="font-head text-base">{c.title}</span>
                {c.review ? (
                  <Badge tone={c.review.status === "CLEAR" ? "ok" : c.review.status === "REJECTED" ? "danger" : "warn"}>{c.review.status} · privacy {c.review.privacyRisk}</Badge>
                ) : pendingByConsent[c.id] ? (
                  <PendingPulse label="review pending" since={pendingByConsent[c.id].startedAt} />
                ) : null}
              </div>
              {c.review && <p className="text-sm mt-2">{c.review.requiredUserSummary}</p>}
              <p className="text-xs text-muted mt-2">{c.dataRequested.join(", ")} · {c.durationDays}d</p>
              <div className="mt-3">
                {c.active ? <Button variant="danger" onClick={() => revoke(c.id)}>Revoke consent</Button> : <Badge tone="info">revoked</Badge>}
              </div>
            </div>
          ))}
          {!state.consents.length && <p className="text-sm text-muted">No consent requests yet.</p>}
        </div>
      </Card>
    </div>
  );
}
