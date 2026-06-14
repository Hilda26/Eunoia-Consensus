import type {
  MoodLog, Commitment, DataCategory, PermissionLevel, EunoiaEvent,
  WellnessReview, GoalReview, ReplyReview, ConsentReview, CheckinReview
} from "@/types";
import { buildSignalBundle } from "@/lib/genlayer/signalBundler";
import { makeEvent, pushEvent } from "./eventEngine";
import type { Reviewer } from "@/lib/genlayer/browserClient";

// All five flows now follow the same shape:
//   submit*  -> { hash, events } the moment Studionet accepts the tx
//   resolve* -> takes the verdict the poller fetched later and returns
//               the "review complete" event so the page can append it.
// The pages register the pending hash + verdict applier via
// usePendingReviews; that hook polls and calls resolve* when the verdict
// lands.

export async function submitWellness(reviewer: Reviewer, args: {
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
  const { hash } = await reviewer.submitWellnessSignal(bundle);
  return { hash, bundle, events };
}

export function resolveWellness(hash: string, review: WellnessReview, events: EunoiaEvent[]) {
  let next = pushEvent(events, makeEvent("GENLAYER_REVIEW_COMPLETED", `risk level: ${review.riskLevel}`, {
    tone: review.riskLevel === "HIGH" ? "danger" : review.riskLevel === "ELEVATED" ? "warn" : "ok",
    txHash: hash
  }));
  if (review.checkInRecommended) {
    next = pushEvent(next, makeEvent("CHECKIN_TRIGGERED", "bounded wellness reflection prepared", { tone: "info" }));
  }
  return next;
}

export async function submitGoal(reviewer: Reviewer, input: {
  userHash: string; goalTitle: string; goalCategory: string;
  targetCount: number; claimedCount: number; evidenceSummary: string; checklistCompleted: boolean;
  events: EunoiaEvent[];
}) {
  let events = pushEvent(input.events, makeEvent("GOAL_EVIDENCE_SUBMITTED", `evidence submitted for "${input.goalTitle}"`, { tone: "info" }));
  events = pushEvent(events, makeEvent("GENLAYER_REVIEW_REQUESTED", "review_goal_accountability submitted", { tone: "accent" }));
  const { events: _drop, ...rest } = input;
  const { hash } = await reviewer.submitGoalAccountability({ ...rest, rawJournalIncluded: false });
  return { hash, events };
}

export function resolveGoal(hash: string, review: GoalReview, events: EunoiaEvent[]) {
  return pushEvent(events, makeEvent("GOAL_REVIEW_COMPLETED", `outcome: ${review.outcome}`, {
    tone: review.outcome === "COMPLETED" ? "ok" : review.outcome === "MISSED" ? "warn" : "info",
    txHash: hash
  }));
}

export async function submitReply(reviewer: Reviewer, input: { userHash: string; circleAlias: string; replyText: string; events: EunoiaEvent[]; }) {
  let events = pushEvent(input.events, makeEvent("GENLAYER_REVIEW_REQUESTED", "review_support_reply submitted", { tone: "accent" }));
  const { hash } = await reviewer.submitSupportReply({ userHash: input.userHash, circleAlias: input.circleAlias, replyText: input.replyText, contextType: "support_circle" });
  return { hash, events };
}

export function resolveReply(hash: string, review: ReplyReview, events: EunoiaEvent[]) {
  let next = pushEvent(events, makeEvent("SUPPORT_REPLY_REVIEWED", `classification: ${review.classification}`, {
    tone: review.visible ? "ok" : "warn", txHash: hash
  }));
  if (review.classification === "CRISIS_LANGUAGE") {
    next = pushEvent(next, makeEvent("CRISIS_LANGUAGE_DETECTED", "safety response triggered", { tone: "danger" }));
  }
  return next;
}

export async function submitConsent(reviewer: Reviewer, input: {
  title: string; requestingEntity: string; dataRequested: string[]; dataNotRequested: string[]; durationDays: number; revocable: boolean; events: EunoiaEvent[];
}) {
  let events = pushEvent(input.events, makeEvent("GENLAYER_REVIEW_REQUESTED", "review_research_consent submitted", { tone: "accent" }));
  const { hash } = await reviewer.submitResearchConsent({
    title: input.title, requestingEntity: input.requestingEntity,
    dataRequested: input.dataRequested, dataNotRequested: input.dataNotRequested,
    durationDays: input.durationDays, revocable: input.revocable
  });
  return { hash, events };
}

export function resolveConsent(hash: string, review: ConsentReview, events: EunoiaEvent[]) {
  return pushEvent(events, makeEvent("CONSENT_REVIEW_COMPLETED", `status: ${review.status}`, {
    tone: review.status === "CLEAR" ? "ok" : review.status === "REJECTED" ? "danger" : "warn",
    txHash: hash
  }));
}

export async function submitCheckin(reviewer: Reviewer, input: { userHash: string; riskLevel: string; recentMoodAvg: number; recentStressAvg: number; missedGoals: number; preferredTone: string; events: EunoiaEvent[]; }) {
  let events = pushEvent(input.events, makeEvent("GENLAYER_REVIEW_REQUESTED", "review_checkin_trigger submitted", { tone: "accent" }));
  const { hash } = await reviewer.submitCheckinTrigger({
    userHash: input.userHash, riskLevel: input.riskLevel,
    recentMoodAvg: input.recentMoodAvg, recentStressAvg: input.recentStressAvg,
    missedGoals: input.missedGoals, preferredTone: input.preferredTone
  });
  return { hash, events };
}

export function resolveCheckin(hash: string, review: CheckinReview, events: EunoiaEvent[]) {
  if (!review.shouldTrigger) return events;
  return pushEvent(events, makeEvent("CHECKIN_TRIGGERED", `tone: ${review.tone}`, { tone: "info", txHash: hash }));
}
