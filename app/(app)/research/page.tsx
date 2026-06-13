"use client";
import { useState } from "react";
import { ModuleHeader, Card, SectionLabel, Button, Field, Badge } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer } from "@/hooks/useReviewer";
import { shortId } from "@/lib/utils/format";
import type { ConsentRequest } from "@/types";
import { reviewConsent } from "@/lib/eunoia/agentCoordinator";

const ALLOWED_FIELDS = ["sleep score range", "stress score range", "mood score range", "energy score range", "goal completion count", "tag frequencies"];
const NEVER_FIELDS = ["journal text", "name", "email", "exact location", "therapy notes", "medical records"];

export default function ResearchPage() {
  const { state, setState } = useStore();
  const { reviewer } = useReviewer();
  const [form, setForm] = useState({ title: "", requestingEntity: "Not connected", durationDays: 30, dataRequested: [] as string[], revocable: true });
  const [busy, setBusy] = useState(false);

  function toggleField(f: string) {
    setForm(s => ({ ...s, dataRequested: s.dataRequested.includes(f) ? s.dataRequested.filter(x => x !== f) : [...s.dataRequested, f] }));
  }

  async function submit() {
    if (!form.title.trim() || !form.dataRequested.length) return;
    setBusy(true);
    try {
      if (!reviewer) throw new Error("not ready");
      const { review, events } = await reviewConsent(reviewer, {
        title: form.title, requestingEntity: form.requestingEntity,
        dataRequested: form.dataRequested, dataNotRequested: NEVER_FIELDS,
        durationDays: form.durationDays, revocable: form.revocable,
        events: state.events
      });
      const req: ConsentRequest = {
        id: shortId("cns"), ts: Date.now(),
        title: form.title, requestingEntity: form.requestingEntity,
        dataRequested: form.dataRequested, dataNotRequested: NEVER_FIELDS,
        durationDays: form.durationDays, revocable: form.revocable,
        review, active: review.status === "CLEAR"
      };
      setState(s => ({ ...s, consents: [req, ...s.consents], events }));
      setForm({ title: "", requestingEntity: "Not connected", durationDays: 30, dataRequested: [], revocable: true });
    } finally { setBusy(false); }
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
        <Button className="mt-6" onClick={submit} disabled={busy}>{busy ? "Reviewing..." : "Run consent review"}</Button>
      </Card>

      <Card className="mt-6">
        <SectionLabel number="08 /" label="Consent history" />
        <div className="grid gap-3 mt-4">
          {state.consents.map(c => (
            <div key={c.id} className="thin-border rounded-2xl p-4 bg-bg/50">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="font-head text-base">{c.title}</span>
                {c.review && <Badge tone={c.review.status === "CLEAR" ? "ok" : c.review.status === "REJECTED" ? "danger" : "warn"}>{c.review.status} · privacy {c.review.privacyRisk}</Badge>}
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
