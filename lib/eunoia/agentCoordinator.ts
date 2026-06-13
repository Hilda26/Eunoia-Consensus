import type {
  MoodLog, Commitment, DataCategory, PermissionLevel, EunoiaEvent
} from "@/types";
import { buildSignalBundle } from "@/lib/genlayer/signalBundler";
import { makeEvent, pushEvent } from "./eventEngine";
import type { Reviewer } from "@/lib/genlayer/browserClient";

export async function reviewWellness(reviewer: Reviewer, args: {
  alias: string;
  logs: MoodLog[];
  commitments: Commitment[];
  permissions: Record<DataCategory, PermissionLevel>;
  events: EunoiaEvent[];
}) {
  const bundle = buildSignalBundle(args);
  let events = pushEvent(args.events, makeEvent("PRIVACY_VAULT", "raw journal note withheld", { tone: "accent" }));
  events = pushEvent(events, makeEvent("SIGNAL_BUNDLE_CREATED", "reduced wellness bundle prepared", { tone: "info" }));
  events = pushEvent(events, makeEvent("GENLAYER_REVIEW_REQUESTED", "review_wellness_signal submitted", { tone: "accent" }));
  const review = await reviewer.reviewWellnessSignal(bundle);
  events = pushEvent(events, makeEvent("GENLAYER_REVIEW_COMPLETED", `risk level: ${review.riskLevel}`, { tone: review.riskLevel === "HIGH" ? "danger" : review.riskLevel === "ELEVATED" ? "warn" : "ok" }));
  if (review.checkInRecommended) events = pushEvent(events, makeEvent("CHECKIN_TRIGGERED", "bounded wellness reflection prepared", { tone: "info" }));
  return { bundle, review, events };
}

export async function reviewGoal(reviewer: Reviewer, input: {
  userHash: string; goalTitle: string; goalCategory: string;
  targetCount: number; claimedCount: number; evidenceSummary: string; checklistCompleted: boolean;
  events: EunoiaEvent[];
}) {
  let events = pushEvent(input.events, makeEvent("GOAL_EVIDENCE_SUBMITTED", `evidence submitted for "${input.goalTitle}"`, { tone: "info" }));
  events = pushEvent(events, makeEvent("GENLAYER_REVIEW_REQUESTED", "review_goal_accountability submitted", { tone: "accent" }));
  const { events: _drop, ...rest } = input;
  const review = await reviewer.reviewGoalAccountability({ ...rest, rawJournalIncluded: false });
  events = pushEvent(events, makeEvent("GOAL_REVIEW_COMPLETED", `outcome: ${review.outcome}`, { tone: review.outcome === "COMPLETED" ? "ok" : review.outcome === "MISSED" ? "warn" : "info" }));
  return { review, events };
}

export async function reviewReply(reviewer: Reviewer, input: { userHash: string; circleAlias: string; replyText: string; events: EunoiaEvent[]; }) {
  let events = pushEvent(input.events, makeEvent("GENLAYER_REVIEW_REQUESTED", "review_support_reply submitted", { tone: "accent" }));
  const review = await reviewer.reviewSupportReply({ userHash: input.userHash, circleAlias: input.circleAlias, replyText: input.replyText, contextType: "support_circle" });
  events = pushEvent(events, makeEvent("SUPPORT_REPLY_REVIEWED", `classification: ${review.classification}`, { tone: review.visible ? "ok" : "warn" }));
  if (review.classification === "CRISIS_LANGUAGE") events = pushEvent(events, makeEvent("CRISIS_LANGUAGE_DETECTED", "safety response triggered", { tone: "danger" }));
  return { review, events };
}

export async function reviewConsent(reviewer: Reviewer, input: {
  title: string; requestingEntity: string; dataRequested: string[]; dataNotRequested: string[]; durationDays: number; revocable: boolean; events: EunoiaEvent[];
}) {
  let events = pushEvent(input.events, makeEvent("GENLAYER_REVIEW_REQUESTED", "review_research_consent submitted", { tone: "accent" }));
  const review = await reviewer.reviewResearchConsent({ title: input.title, requestingEntity: input.requestingEntity, dataRequested: input.dataRequested, dataNotRequested: input.dataNotRequested, durationDays: input.durationDays, revocable: input.revocable });
  events = pushEvent(events, makeEvent("CONSENT_REVIEW_COMPLETED", `status: ${review.status}`, { tone: review.status === "CLEAR" ? "ok" : review.status === "REJECTED" ? "danger" : "warn" }));
  return { review, events };
}

export async function reviewCheckin(reviewer: Reviewer, input: { userHash: string; riskLevel: string; recentMoodAvg: number; recentStressAvg: number; missedGoals: number; preferredTone: string; events: EunoiaEvent[]; }) {
  let events = pushEvent(input.events, makeEvent("GENLAYER_REVIEW_REQUESTED", "review_checkin_trigger submitted", { tone: "accent" }));
  const review = await reviewer.reviewCheckinTrigger({
    userHash: input.userHash, riskLevel: input.riskLevel,
    recentMoodAvg: input.recentMoodAvg, recentStressAvg: input.recentStressAvg,
    missedGoals: input.missedGoals, preferredTone: input.preferredTone
  });
  if (review.shouldTrigger) events = pushEvent(events, makeEvent("CHECKIN_TRIGGERED", `tone: ${review.tone}`, { tone: "info" }));
  return { review, events };
}
