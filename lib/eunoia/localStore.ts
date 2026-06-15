"use client";
import type {
  MoodLog, Commitment, SupportReply, ConsentRequest,
  PermissionLevel, DataCategory, EunoiaEvent, WellnessReview
} from "@/types";

// Storage is scoped by Privy user id so two users on the same browser
// (sequential sign-ins from different wallets) get isolated state -
// signing in as a new user no longer reveals the prior user's alias,
// mood logs, commitments, etc. Unauthenticated users fall back to a
// shared "anon" key, mostly for SSR safety and the first paint.
const KEY_PREFIX = "eunoia.state.v1";
function keyFor(userId: string | null | undefined): string {
  return `${KEY_PREFIX}.${userId || "anon"}`;
}

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

// Stable, calm default alias derived from the user id so two fresh
// sign-ins don't both land on the same "QuietOak".
const ADJECTIVES = ["Quiet", "Calm", "Soft", "Gentle", "Steady", "Warm", "Bright", "Pale"];
const NOUNS = ["Oak", "Fern", "Reed", "Sage", "Pine", "Ivy", "Moss", "Dawn", "River", "Cedar"];
function aliasFor(userId: string | null | undefined): string {
  if (!userId) return "QuietOak";
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = ((h << 5) - h + userId.charCodeAt(i)) | 0;
  const adj = ADJECTIVES[Math.abs(h) % ADJECTIVES.length];
  const noun = NOUNS[Math.abs(h >> 8) % NOUNS.length];
  return `${adj}${noun}`;
}

export function defaultStateFor(userId?: string | null): EunoiaState {
  return {
    alias: aliasFor(userId),
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
}

// Kept for back-compat with code that imports initialState as a constant.
export const initialState: EunoiaState = defaultStateFor(null);

export function loadState(userId?: string | null): EunoiaState {
  if (typeof window === "undefined") return defaultStateFor(userId);
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    const base = defaultStateFor(userId);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<EunoiaState>;
    return { ...base, ...parsed, permissions: { ...defaultPermissions, ...(parsed.permissions || {}) } };
  } catch {
    return defaultStateFor(userId);
  }
}

export function saveState(s: EunoiaState, userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(userId), JSON.stringify(s));
}

export function resetState(userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(keyFor(userId));
}

export function exportStateJson(s: EunoiaState): string {
  return JSON.stringify(s, null, 2);
}
