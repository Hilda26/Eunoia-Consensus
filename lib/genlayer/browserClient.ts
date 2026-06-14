// Browser-side review client.
//
// Studionet transactions cannot be signed through Privy's EIP-1193 provider
// (GenLayer uses a custom tx encoding via gen_sendRawTransaction, not the
// standard EVM dialect Privy speaks). So instead of signing in the browser
// we POST the review request to /api/review, which verifies the Privy
// access token and signs with a server-side GenLayer key.
//
// The Reviewer interface stays identical to what agentCoordinator expects.

import type {
  SignalBundle, WellnessReview, GoalReview, ReplyReview, ConsentReview, CheckinReview
} from "@/types";
import type {
  GoalEvidenceInput, ReplyReviewInput, ConsentRequestInput, CheckinSignalInput
} from "./types";

type TokenFetcher = () => Promise<string | null>;

export type ReviewWithTx<T> = { result: T; hash: string };

export type Reviewer = ReturnType<typeof makeReviewer>;

export function makeReviewer(getAccessToken: TokenFetcher) {
  async function call<T>(method: string, payload: unknown): Promise<ReviewWithTx<T>> {
    const token = await getAccessToken();
    if (!token) throw new Error("Not signed in - sign in to submit a review.");
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ method, payload })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `review service returned ${res.status}`);
    }
    return { result: data.verdict as T, hash: String(data.hash || "") };
  }
  return {
    reviewWellnessSignal: (bundle: SignalBundle): Promise<ReviewWithTx<WellnessReview>> =>
      call("review_wellness_signal", bundle),
    reviewGoalAccountability: (input: GoalEvidenceInput): Promise<ReviewWithTx<GoalReview>> =>
      call("review_goal_accountability", input),
    reviewSupportReply: (input: ReplyReviewInput): Promise<ReviewWithTx<ReplyReview>> =>
      call("review_support_reply", input),
    reviewResearchConsent: (input: ConsentRequestInput): Promise<ReviewWithTx<ConsentReview>> =>
      call("review_research_consent", input),
    reviewCheckinTrigger: (input: CheckinSignalInput): Promise<ReviewWithTx<CheckinReview>> =>
      call("review_checkin_trigger", input)
  };
}
