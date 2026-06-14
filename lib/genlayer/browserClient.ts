// Browser-side review submission client.
//
// Studionet transactions cannot be signed through Privy's EIP-1193 provider,
// so we POST to /api/review which signs with a server-side GenLayer key.
// The API returns the tx hash immediately - the verdict is read later by
// polling /api/tx/<hash>. The Pending list in localStorage + the
// usePendingReviews hook own that polling so submissions survive refresh.

import type {
  SignalBundle
} from "@/types";
import type {
  GoalEvidenceInput, ReplyReviewInput, ConsentRequestInput, CheckinSignalInput
} from "./types";

type TokenFetcher = () => Promise<string | null>;

export type ReviewMethod =
  | "review_wellness_signal"
  | "review_goal_accountability"
  | "review_support_reply"
  | "review_research_consent"
  | "review_checkin_trigger";

export type Reviewer = ReturnType<typeof makeReviewer>;

export function makeReviewer(getAccessToken: TokenFetcher) {
  async function submit(method: ReviewMethod, payload: unknown): Promise<{ hash: string }> {
    const token = await getAccessToken();
    if (!token) throw new Error("Not signed in - sign in to submit a review.");
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ method, payload })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data?.hash) {
      throw new Error(data?.error || `review service returned ${res.status}`);
    }
    return { hash: String(data.hash) };
  }
  return {
    submitWellnessSignal: (bundle: SignalBundle) =>
      submit("review_wellness_signal", bundle),
    submitGoalAccountability: (input: GoalEvidenceInput) =>
      submit("review_goal_accountability", input),
    submitSupportReply: (input: ReplyReviewInput) =>
      submit("review_support_reply", input),
    submitResearchConsent: (input: ConsentRequestInput) =>
      submit("review_research_consent", input),
    submitCheckinTrigger: (input: CheckinSignalInput) =>
      submit("review_checkin_trigger", input)
  };
}
