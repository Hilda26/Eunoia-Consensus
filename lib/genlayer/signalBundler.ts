import type { MoodLog, Commitment, DataCategory, PermissionLevel, SignalBundle } from "@/types";
import { hashStable, userHashFromAlias, avg } from "@/lib/utils/format";
import { withheldList, isAllowedForReview } from "@/lib/eunoia/privacyVault";

// moodLogs is stored oldest-first (new entries appended). Take the most
// recent n, keeping chronological (oldest -> newest) order so GenLayer reads
// the trend in the right direction.
function take(arr: MoodLog[], n: number) { return arr.slice(-n); }

function sentimentFromNotes(logs: MoodLog[]): string {
  if (!logs.length) return "neutral";
  const a = avg(logs.map(l => l.mood));
  const s = avg(logs.map(l => l.stress));
  if (s >= 7 && a <= 4) return "stressed";
  if (a >= 7 && s <= 4) return "uplifted";
  if (s >= 6) return "tense";
  if (a <= 4) return "low";
  return "steady";
}

export function buildSignalBundle(params: {
  alias: string;
  logs: MoodLog[];
  commitments: Commitment[];
  permissions: Record<DataCategory, PermissionLevel>;
}): SignalBundle {
  const { alias, logs, commitments, permissions } = params;
  const recent = take(logs, 4);
  const userHash = userHashFromAlias(alias);

  const moodAllowed = isAllowedForReview(permissions.MOOD_LOGS);
  const sleepAllowed = isAllowedForReview(permissions.SLEEP_DATA);
  const energyAllowed = isAllowedForReview(permissions.ENERGY_LOGS);

  const moodTrend = moodAllowed ? recent.map(l => l.mood) : [];
  const stressTrend = moodAllowed ? recent.map(l => l.stress) : [];
  const sleepTrend = sleepAllowed ? recent.map(l => l.sleep) : [];
  const energyTrend = energyAllowed ? recent.map(l => l.energy) : [];

  const tags = Array.from(new Set(recent.flatMap(l => l.tags))).slice(0, 8);
  const missedGoals = commitments.filter(c => c.claimedCount < c.target).length;

  const journalSentiment = moodAllowed ? sentimentFromNotes(recent) : "withheld";

  const bundle: Omit<SignalBundle, "inputHash"> = {
    userHash,
    moodTrend,
    stressTrend,
    sleepTrend,
    energyTrend,
    missedGoals,
    tags,
    journalSentiment,
    rawJournalIncluded: false,
    withheld: withheldList(permissions)
  };
  const inputHash = hashStable(JSON.stringify(bundle));
  return { ...bundle, inputHash };
}
