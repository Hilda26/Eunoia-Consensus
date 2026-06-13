export type RiskLevel = "STEADY" | "WATCH" | "ELEVATED" | "HIGH";
export type GoalOutcome = "COMPLETED" | "PARTIAL" | "INSUFFICIENT_EVIDENCE" | "MISSED" | "NEEDS_MORE_CONTEXT";
export type ReplyClassification = "SUPPORTIVE" | "NEUTRAL" | "UNSAFE" | "MEDICAL_ADVICE" | "CRISIS_LANGUAGE";
export type ConsentStatus = "CLEAR" | "NEEDS_REVISION" | "HIGH_PRIVACY_RISK" | "REJECTED";
export type CheckinTone = "gentle" | "direct" | "reflective" | "practical" | "motivational";

export type PermissionLevel =
  | "PRIVATE"
  | "GENLAYER_REVIEW_ONLY"
  | "SUPPORT_CIRCLE_ALIAS"
  | "ANONYMISED_RESEARCH"
  | "DISABLED";

export type DataCategory =
  | "MOOD_LOGS"
  | "JOURNAL_NOTES"
  | "SLEEP_DATA"
  | "ENERGY_LOGS"
  | "AI_CHECKINS"
  | "SUPPORT_ALIAS"
  | "RESEARCH_PERMISSIONS"
  | "RISK_REVIEWS"
  | "COMMITMENT_HISTORY";

export interface MoodLog {
  id: string;
  ts: number;
  mood: number;
  stress: number;
  anxiety: number;
  energy: number;
  sleep: number;
  note: string;
  tags: string[];
}

export interface Commitment {
  id: string;
  ts: number;
  title: string;
  category: string;
  frequency: "daily" | "weekly";
  target: number;
  privacy: PermissionLevel;
  accountability: "personal" | "circle";
  evidenceType: "text" | "checklist" | "summary";
  claimedCount: number;
  evidenceSummary?: string;
  checklistCompleted?: boolean;
  lastReview?: GoalReview;
}

export interface SupportReply {
  id: string;
  ts: number;
  circle: string;
  alias: string;
  text: string;
  review?: ReplyReview;
}

export interface ConsentRequest {
  id: string;
  ts: number;
  title: string;
  requestingEntity: string;
  dataRequested: string[];
  dataNotRequested: string[];
  durationDays: number;
  revocable: boolean;
  review?: ConsentReview;
  active: boolean;
}

export interface WellnessReview {
  riskLevel: RiskLevel;
  score: number;
  checkInRecommended: boolean;
  signals: string[];
  recommendedActions: string[];
  safetyNote: string;
  reviewId: string;
  ts: number;
}

export interface GoalReview {
  outcome: GoalOutcome;
  confidence: number;
  reasoning: string;
  nextStep: string;
  reviewId: string;
  ts: number;
}

export interface ReplyReview {
  classification: ReplyClassification;
  visible: boolean;
  qualityBadge: boolean;
  reasoning: string;
  reviewId: string;
  ts: number;
}

export interface ConsentReview {
  status: ConsentStatus;
  privacyRisk: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string;
  requiredUserSummary: string;
  reviewId: string;
  ts: number;
}

export interface CheckinReview {
  shouldTrigger: boolean;
  tone: CheckinTone;
  reason: string;
  checkinPrompt: string;
  disclaimer: string;
  reviewId: string;
  ts: number;
}

export type EunoiaEventType =
  | "MOOD_SIGNAL_CREATED"
  | "PRIVACY_PERMISSION_UPDATED"
  | "SIGNAL_BUNDLE_CREATED"
  | "GENLAYER_REVIEW_REQUESTED"
  | "GENLAYER_REVIEW_COMPLETED"
  | "CHECKIN_TRIGGERED"
  | "COMMITMENT_CREATED"
  | "GOAL_EVIDENCE_SUBMITTED"
  | "GOAL_REVIEW_COMPLETED"
  | "SUPPORT_REPLY_REVIEWED"
  | "CONSENT_REVIEW_COMPLETED"
  | "CRISIS_LANGUAGE_DETECTED"
  | "PRIVACY_VAULT"
  | "SAFETY";

export interface EunoiaEvent {
  id: string;
  ts: number;
  type: EunoiaEventType;
  label: string;
  detail?: string;
  tone?: "info" | "ok" | "warn" | "danger" | "accent";
}

export interface SignalBundle {
  userHash: string;
  moodTrend: number[];
  stressTrend: number[];
  sleepTrend: number[];
  energyTrend: number[];
  missedGoals: number;
  tags: string[];
  journalSentiment: string;
  rawJournalIncluded: false;
  inputHash: string;
  withheld: string[];
}
