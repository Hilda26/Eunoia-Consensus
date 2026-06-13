"use client";
import { ModuleHeader, Card, SectionLabel, Badge, Button } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { describeLevel, withheldList } from "@/lib/eunoia/privacyVault";
import { exportStateJson } from "@/lib/eunoia/localStore";
import { makeEvent, pushEvent } from "@/lib/eunoia/eventEngine";
import type { DataCategory, PermissionLevel } from "@/types";

const CATEGORIES: { id: DataCategory; label: string }[] = [
  { id: "MOOD_LOGS", label: "Mood Logs" },
  { id: "JOURNAL_NOTES", label: "Journal Notes" },
  { id: "SLEEP_DATA", label: "Sleep Data" },
  { id: "ENERGY_LOGS", label: "Energy Logs" },
  { id: "AI_CHECKINS", label: "AI Check-ins" },
  { id: "SUPPORT_ALIAS", label: "Support Alias" },
  { id: "RESEARCH_PERMISSIONS", label: "Research Permissions" },
  { id: "RISK_REVIEWS", label: "Risk Reviews" },
  { id: "COMMITMENT_HISTORY", label: "Commitment History" }
];

const LEVELS: PermissionLevel[] = ["PRIVATE", "GENLAYER_REVIEW_ONLY", "SUPPORT_CIRCLE_ALIAS", "ANONYMISED_RESEARCH", "DISABLED"];

export default function VaultPage() {
  const { state, setState } = useStore();

  function setLevel(cat: DataCategory, level: PermissionLevel) {
    setState(s => ({
      ...s,
      permissions: { ...s.permissions, [cat]: level },
      events: pushEvent(s.events, makeEvent("PRIVACY_PERMISSION_UPDATED", `${cat} -> ${level}`, { tone: "info" }))
    }));
  }

  function exportData() {
    const blob = new Blob([exportStateJson(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "eunoia-local-data.json"; a.click();
    URL.revokeObjectURL(url);
  }

  function deleteCategory(cat: DataCategory) {
    setState(s => {
      const next = { ...s };
      if (cat === "MOOD_LOGS") next.moodLogs = [];
      if (cat === "COMMITMENT_HISTORY") next.commitments = [];
      if (cat === "RISK_REVIEWS") next.lastWellnessReview = undefined;
      next.events = pushEvent(s.events, makeEvent("PRIVACY_VAULT", `${cat} cleared locally`, { tone: "warn" }));
      return next;
    });
  }

  return (
    <div>
      <ModuleHeader section="06 / privacy vault" title="What is shared, and what is not" subtitle="Permission changes here directly affect what enters the reduced signal bundle sent to GenLayer." />

      <Card className="mb-6">
        <SectionLabel number="01 /" label="Data withheld" />
        <p className="text-sm text-muted mt-2">These categories are never included in the GenLayer bundle.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {withheldList(state.permissions).map(w => <Badge key={w} tone="ok">{w}</Badge>)}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {CATEGORIES.map(c => {
          const level = state.permissions[c.id];
          return (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <h3 className="font-head text-lg">{c.label}</h3>
                <Badge tone={level === "PRIVATE" || level === "DISABLED" ? "ok" : "accent"}>{level}</Badge>
              </div>
              <p className="text-sm text-muted mt-2">{describeLevel(level)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {LEVELS.map(l => (
                  <button key={l} className={`chip ${level === l ? "bg-aubergine text-bg border-aubergine" : ""}`} onClick={() => setLevel(c.id, l)}>{l}</button>
                ))}
              </div>
              <div className="mt-4">
                <Button variant="danger" onClick={() => deleteCategory(c.id)}>Delete local {c.label.toLowerCase()}</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <SectionLabel number="09 /" label="Export / delete" />
        <div className="flex gap-3 mt-3 flex-wrap">
          <Button onClick={exportData}>Export local data</Button>
          <Button variant="danger" onClick={() => CATEGORIES.forEach(c => deleteCategory(c.id))}>Delete all categories</Button>
        </div>
      </Card>
    </div>
  );
}
