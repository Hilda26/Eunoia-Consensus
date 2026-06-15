"use client";
import { useEffect, useState } from "react";
import { ModuleHeader, Card, SectionLabel, Field, Button, Badge } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer, useWalletAddress } from "@/hooks/useReviewer";
import { usePrivy } from "@privy-io/react-auth";
import { exportStateJson } from "@/lib/eunoia/localStore";
import { GLOBAL_DISCLAIMER } from "@/lib/eunoia/safety";

type Tone = "gentle" | "direct" | "reflective" | "practical" | "motivational";
type PrivacyDefault = "PRIVATE" | "GENLAYER_REVIEW_ONLY" | "SUPPORT_CIRCLE_ALIAS" | "ANONYMISED_RESEARCH" | "DISABLED";

export default function SettingsPage() {
  const { state, setState, reset } = useStore();
  const { status } = useReviewer();
  const address = useWalletAddress();
  const { user, logout } = usePrivy();

  // Profile edits sit in a local draft until the user clicks Save. This
  // matches the mental model of "type your name, then save" - even though
  // the store still auto-persists, the explicit Save button makes it
  // obvious that the change took.
  const [draft, setDraft] = useState({
    alias: state.alias,
    assistantTone: state.assistantTone as Tone,
    privacyDefault: state.privacyDefault as PrivacyDefault
  });
  const [savedFlash, setSavedFlash] = useState(false);

  // If the store's profile changes externally (initial load, account
  // switch, reset), sync the draft.
  useEffect(() => {
    setDraft({
      alias: state.alias,
      assistantTone: state.assistantTone as Tone,
      privacyDefault: state.privacyDefault as PrivacyDefault
    });
  }, [state.alias, state.assistantTone, state.privacyDefault]);

  const dirty =
    draft.alias !== state.alias ||
    draft.assistantTone !== state.assistantTone ||
    draft.privacyDefault !== state.privacyDefault;

  function saveProfile() {
    const cleanAlias = draft.alias.trim() || state.alias;
    setState(s => ({
      ...s,
      alias: cleanAlias,
      assistantTone: draft.assistantTone,
      privacyDefault: draft.privacyDefault
    }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

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
          <SectionLabel number="01 /" label="Profile" />
          <div className="mt-4 grid gap-4">
            <Field label="Alias">
              <input
                value={draft.alias}
                onChange={e => setDraft(d => ({ ...d, alias: e.target.value }))}
                placeholder={state.alias}
              />
            </Field>
            <Field label="Assistant tone">
              <select
                value={draft.assistantTone}
                onChange={e => setDraft(d => ({ ...d, assistantTone: e.target.value as Tone }))}
              >
                {(["gentle", "direct", "reflective", "practical", "motivational"] as Tone[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Privacy default">
              <select
                value={draft.privacyDefault}
                onChange={e => setDraft(d => ({ ...d, privacyDefault: e.target.value as PrivacyDefault }))}
              >
                {(["PRIVATE", "GENLAYER_REVIEW_ONLY", "SUPPORT_CIRCLE_ALIAS", "ANONYMISED_RESEARCH", "DISABLED"] as PrivacyDefault[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <div className="flex items-center justify-between gap-3 pt-1">
              <Button onClick={saveProfile} disabled={!dirty}>Save profile</Button>
              {savedFlash ? (
                <span className="text-xs text-sage">Saved on this device.</span>
              ) : dirty ? (
                <span className="text-xs text-clay">Unsaved changes</span>
              ) : (
                <span className="text-xs text-muted">All changes saved on this device.</span>
              )}
            </div>
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
