"use client";
import { useEffect, useRef, useState } from "react";
import { ModuleHeader, Card, SectionLabel, Field, Button, Badge } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer, useWalletAddress } from "@/hooks/useReviewer";
import { usePrivy } from "@privy-io/react-auth";
import { exportStateJson } from "@/lib/eunoia/localStore";
import { GLOBAL_DISCLAIMER } from "@/lib/eunoia/safety";

export default function SettingsPage() {
  const { state, setState, reset } = useStore();
  const { status } = useReviewer();
  const address = useWalletAddress();
  const { user, logout } = usePrivy();

  // Profile changes are auto-persisted by useStore on every keystroke; the
  // flash gives the user explicit visual confirmation so they don't keep
  // looking for a Save button that does not exist.
  const [saved, setSaved] = useState(false);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [state.alias, state.assistantTone, state.privacyDefault]);

  function exportData() {
    const blob = new Blob([exportStateJson(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "eunoia-local-data.json"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <ModuleHeader section="10 / settings" title="Session and privacy" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <SectionLabel number="01 /" label="Profile" />
            <span className={`text-xs transition-opacity ${saved ? "opacity-100 text-sage" : "opacity-60 text-muted"}`}>
              {saved ? "Saving on this device" : "Auto-saved on this device"}
            </span>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Alias"><input value={state.alias} onChange={e => setState(s => ({ ...s, alias: e.target.value }))} /></Field>
            <Field label="Assistant tone">
              <select value={state.assistantTone} onChange={e => setState(s => ({ ...s, assistantTone: e.target.value as any }))}>
                {["gentle", "direct", "reflective", "practical", "motivational"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Privacy default">
              <select value={state.privacyDefault} onChange={e => setState(s => ({ ...s, privacyDefault: e.target.value as any }))}>
                {["PRIVATE", "GENLAYER_REVIEW_ONLY", "SUPPORT_CIRCLE_ALIAS", "ANONYMISED_RESEARCH", "DISABLED"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel number="02 /" label="Your account" />
          <div className="grid gap-2 mt-3 text-sm">
            {user?.email?.address && <div className="flex justify-between"><span>Email</span><span className="text-muted">{user.email.address}</span></div>}
            {address && <div className="flex justify-between gap-2"><span>Wallet</span><span className="font-mono text-xs text-muted break-all">{address}</span></div>}
            <div className="flex justify-between"><span>Reflection signer</span><Badge tone={status === "ready" ? "ok" : "warn"}>{status === "ready" ? "ready" : status === "loading" ? "loading" : "not connected"}</Badge></div>
          </div>
          <div className="mt-4">
            <Button variant="secondary" onClick={logout}>Sign out</Button>
          </div>
        </Card>

        <Card>
          <SectionLabel number="03 /" label="Your local data" />
          <div className="flex flex-wrap gap-3 mt-3">
            <Button onClick={exportData}>Export local data</Button>
            <Button variant="danger" onClick={reset}>Reset local data</Button>
          </div>
        </Card>

        <Card>
          <SectionLabel number="04 /" label="A note on safety" />
          <p className="text-sm text-muted mt-3">{GLOBAL_DISCLAIMER}</p>
          <label className="flex items-center gap-2 text-sm mt-4">
            <input type="checkbox" className="w-auto" checked={state.disclaimerAcknowledged} onChange={e => setState(s => ({ ...s, disclaimerAcknowledged: e.target.checked }))} />
            <span>I understand Eunoia is not medical care, therapy, or crisis support.</span>
          </label>
        </Card>
      </div>
    </div>
  );
}
