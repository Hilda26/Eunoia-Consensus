"use client";
import { ModuleHeader, StatCard, Card, SectionLabel, Badge } from "@/components/ui/Primitives";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useStore } from "@/hooks/useStore";
import { avg } from "@/lib/utils/format";
import { riskTone } from "@/lib/genlayer/consensusMapper";

export default function OverviewPage() {
  const { state } = useStore();
  const recent = state.moodLogs.slice(-4);
  const moodAvg = avg(recent.map(l => l.mood));
  const stressAvg = avg(recent.map(l => l.stress));
  const sleepAvg = avg(recent.map(l => l.sleep));
  const energyAvg = avg(recent.map(l => l.energy));
  const cur = state.commitments[0];
  const last = state.lastWellnessReview;

  return (
    <div>
      <ModuleHeader section="01 / overview" title="Today" subtitle="A calm view of your wellness signals and a quiet record of what you have done today." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Mood today" value={moodAvg ? moodAvg.toFixed(1) : "-"} sub="avg of last 4 logs" />
        <StatCard label="Stress level" value={stressAvg ? stressAvg.toFixed(1) : "-"} tone={stressAvg >= 7 ? "warn" : "info"} />
        <StatCard label="Sleep quality" value={sleepAvg ? sleepAvg.toFixed(1) : "-"} tone={sleepAvg && sleepAvg < 6 ? "warn" : "info"} />
        <StatCard label="Energy" value={energyAvg ? energyAvg.toFixed(1) : "-"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mt-6">
        <Card>
          <SectionLabel number="02 /" label="Current commitment" />
          {cur ? (
            <div className="mt-3">
              <p className="font-head text-xl">{cur.title}</p>
              <p className="text-sm text-muted mt-1">{cur.claimedCount} / {cur.target} this {cur.frequency.replace("ly", "")}</p>
              <Badge tone="accent" className="mt-3">{cur.category}</Badge>
            </div>
          ) : <p className="text-sm text-muted mt-3">No active commitment yet.</p>}
        </Card>
        <Card>
          <SectionLabel number="03 /" label="Risk indicator" />
          <div className="mt-3 flex items-center justify-between">
            <span className="font-head text-3xl">{last?.riskLevel ?? "STEADY"}</span>
            <Badge tone={riskTone(last?.riskLevel ?? "STEADY")}>{last ? `score ${last.score}` : "no review yet"}</Badge>
          </div>
          <p className="text-xs text-muted mt-3">A gentle non-medical summary of your recent signals.</p>
        </Card>
        <Card>
          <SectionLabel number="04 /" label="What stays private" />
          <ul className="mt-3 text-sm grid gap-1.5">
            <li className="flex justify-between"><span>Raw journal text</span><Badge tone="ok">on device</Badge></li>
            <li className="flex justify-between"><span>Name and email</span><Badge tone="ok">on device</Badge></li>
            <li className="flex justify-between"><span>Exact location</span><Badge tone="ok">on device</Badge></li>
            <li className="flex justify-between"><span>Therapy notes</span><Badge tone="ok">on device</Badge></li>
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <SectionLabel number="05 /" label="Recent activity" />
        <p className="text-sm text-muted mt-2">A quiet log of what you have done.</p>
        <div className="mt-4"><RecentActivity limit={8} /></div>
      </Card>
    </div>
  );
}
