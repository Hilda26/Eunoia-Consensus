// Browser-side GenLayer client.
//
// Signing is done by the Privy wallet (embedded or external) via the
// EIP-1193 provider returned by `wallet.getEthereumProvider()`. The Privy
// user account is the on-chain author of every review.

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { GenLayerChain } from "genlayer-js/types";
import type {
  SignalBundle, WellnessReview, GoalReview, ReplyReview, ConsentReview, CheckinReview
} from "@/types";
import type {
  GoalEvidenceInput, ReplyReviewInput, ConsentRequestInput, CheckinSignalInput
} from "./types";

const CONTRACT = (process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "") as `0x${string}`;
const ENDPOINT = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

type EipProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

export type Reviewer = ReturnType<typeof makeReviewer>;

export function makeReviewer(provider: EipProvider) {
  const client = createClient({
    chain: studionet as GenLayerChain,
    endpoint: ENDPOINT,
    provider: provider as any
  });

  async function callWrite(method:
    | "review_wellness_signal"
    | "review_goal_accountability"
    | "review_support_reply"
    | "review_research_consent"
    | "review_checkin_trigger", payload: unknown) {
    if (!CONTRACT) throw new Error("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not set");
    const hash = await client.writeContract({
      address: CONTRACT,
      functionName: method,
      args: [JSON.stringify(payload)],
      value: 0n
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    return parseLeaderResult(receipt);
  }

  return {
    reviewWellnessSignal: (bundle: SignalBundle): Promise<WellnessReview> =>
      callWrite("review_wellness_signal", bundle),
    reviewGoalAccountability: (input: GoalEvidenceInput): Promise<GoalReview> =>
      callWrite("review_goal_accountability", input),
    reviewSupportReply: (input: ReplyReviewInput): Promise<ReplyReview> =>
      callWrite("review_support_reply", input),
    reviewResearchConsent: (input: ConsentRequestInput): Promise<ConsentReview> =>
      callWrite("review_research_consent", input),
    reviewCheckinTrigger: (input: CheckinSignalInput): Promise<CheckinReview> =>
      callWrite("review_checkin_trigger", input)
  };
}

function parseLeaderResult(receipt: any): any {
  const leaders = receipt?.consensus_data?.leader_receipt;
  const lr = Array.isArray(leaders) ? leaders[0] : leaders;
  if (!lr) throw new Error("Studionet did not return a leader receipt");
  if (lr.error) throw new Error(`Studionet review failed: ${lr.error}`);
  const raw = lr.result;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { /* fall through */ }
    if (raw.startsWith("0x")) {
      try {
        const bytes = hexToBytes(raw);
        const text = new TextDecoder().decode(bytes);
        const idx = text.indexOf("{");
        if (idx >= 0) return JSON.parse(text.slice(idx));
      } catch { /* fall through */ }
    }
    return { raw };
  }
  return raw;
}

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}
