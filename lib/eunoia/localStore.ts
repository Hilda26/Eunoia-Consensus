"use client";
import type {
  MoodLog, Commitment, SupportReply, ConsentRequest,
  PermissionLevel, DataCategory, EunoiaEvent, WellnessReview
} from "@/types";

const KEY = "eunoia.state.v1";

export interface EunoiaState {
  alias: string;
  assistantTone: "gentle" | "direct" | "reflective" | "practical" | "motivational";
  consensusVisibility: "expanded" | "compact";
  privacyDefault: PermissionLevel;
  disclaimerAcknowledged: boolean;
  moodLogs: MoodLog[];
  commitments: Commitment[];
  replies: SupportReply[];
  consents: ConsentRequest[];
  events: EunoiaEvent[];
  permissions: Record<DataCategory, PermissionLevel>;
  lastWellnessReview?: WellnessReview;
}

export const defaultPermissions: Record<DataCategory, PermissionLevel> = {
  MOOD_LOGS: "GENLAYER_REVIEW_ONLY",
  JOURNAL_NOTES: "PRIVATE",
  SLEEP_DATA: "GENLAYER_REVIEW_ONLY",
  ENERGY_LOGS: "GENLAYER_REVIEW_ONLY",
  AI_CHECKINS: "GENLAYER_REVIEW_ONLY",
  SUPPORT_ALIAS: "SUPPORT_CIRCLE_ALIAS",
  RESEARCH_PERMISSIONS: "PRIVATE",
  RISK_REVIEWS: "GENLAYER_REVIEW_ONLY",
  COMMITMENT_HISTORY: "GENLAYER_REVIEW_ONLY"
};

export const initialState: EunoiaState = {
  alias: "QuietOak",
  assistantTone: "gentle",
  consensusVisibility: "expanded",
  privacyDefault: "GENLAYER_REVIEW_ONLY",
  disclaimerAcknowledged: false,
  moodLogs: [],
  commitments: [],
  replies: [],
  consents: [],
  events: [],
  permissions: { ...defaultPermissions }
};

export function loadState(): EunoiaState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<EunoiaState>;
    return { ...initialState, ...parsed, permissions: { ...defaultPermissions, ...(parsed.permissions || {}) } };
  } catch {
    return initialState;
  }
}

export function saveState(s: EunoiaState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function resetState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function exportStateJson(s: EunoiaState): string {
  return JSON.stringify(s, null, 2);
}
