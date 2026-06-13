import type { SignalBundle, WellnessReview, GoalReview, ReplyReview, ConsentReview, CheckinReview } from "@/types";

export interface GoalEvidenceInput {
  userHash: string;
  goalTitle: string;
  goalCategory: string;
  targetCount: number;
  claimedCount: number;
  evidenceSummary: string;
  checklistCompleted: boolean;
  rawJournalIncluded: false;
}

export interface ReplyReviewInput {
  userHash: string;
  circleAlias: string;
  replyText: string;
  contextType: "support_circle";
}

export interface ConsentRequestInput {
  title: string;
  requestingEntity: string;
  dataRequested: string[];
  dataNotRequested: string[];
  durationDays: number;
  revocable: boolean;
}

export interface CheckinSignalInput {
  userHash: string;
  riskLevel: string;
  recentMoodAvg: number;
  recentStressAvg: number;
  missedGoals: number;
  preferredTone: string;
}

export type ReviewKind = "wellness" | "goal" | "reply" | "consent" | "checkin";

export interface ContractMethod {
  name: string;
  purpose: string;
  inputShape: string;
  outputShape: string;
}

export const CONTRACT_METHODS: ContractMethod[] = [
  { name: "review_wellness_signal", purpose: "Classify wellness signal bundle and recommend check-in.", inputShape: "signalBundleJson", outputShape: "{ riskLevel, score, checkInRecommended, signals[], recommendedActions[], safetyNote }" },
  { name: "review_goal_accountability", purpose: "Judge whether evidence reasonably supports commitment.", inputShape: "goalEvidenceJson", outputShape: "{ outcome, confidence, reasoning, nextStep }" },
  { name: "review_support_reply", purpose: "Classify support-circle reply safety and quality.", inputShape: "replyReviewJson", outputShape: "{ classification, visible, qualityBadge, reasoning }" },
  { name: "review_research_consent", purpose: "Review clarity and privacy risk of consent requests.", inputShape: "consentRequestJson", outputShape: "{ status, privacyRisk, reasoning, requiredUserSummary }" },
  { name: "review_checkin_trigger", purpose: "Decide whether a bounded check-in should be shown.", inputShape: "checkinSignalJson", outputShape: "{ shouldTrigger, tone, reason, checkinPrompt, disclaimer }" },
  { name: "get_review", purpose: "Fetch a stored review by id.", inputShape: "reviewId", outputShape: "review" },
  { name: "get_user_reviews", purpose: "Fetch reviews for a userHash.", inputShape: "userHash", outputShape: "review[]" },
  { name: "get_protocol_stats", purpose: "Aggregate stats across all reviews.", inputShape: "-", outputShape: "{ totalReviews, byType }" }
];

export type { SignalBundle, WellnessReview, GoalReview, ReplyReview, ConsentReview, CheckinReview };
