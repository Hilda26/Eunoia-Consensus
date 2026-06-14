// Server-side signer for GenLayer Studionet writes.
//
// The browser cannot sign GenLayer transactions through Privy's EIP-1193
// provider (Studionet uses its own tx encoding via gen_sendRawTransaction,
// not standard EVM). Instead the browser POSTs the review request here; we
// verify the Privy access token, sign with GENLAYER_PRIVATE_KEY, dispatch
// to the EunoiaConsensus contract, and stream the parsed verdict back.
//
// Why this is safe for Eunoia specifically:
//   - Studionet does not meter gas.
//   - EunoiaConsensus has no per-author / per-caller logic - userHash in
//     the payload is what binds a review to a user, so the on-chain signer
//     does not need to be the user.
//   - Privy JWT verification still gates access to this route.

import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTRACT = (process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || "") as `0x${string}`;
const ENDPOINT = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || "";
const SIGNER_KEY = process.env.GENLAYER_PRIVATE_KEY || "";

const ALLOWED_METHODS = new Set([
  "review_wellness_signal",
  "review_goal_accountability",
  "review_support_reply",
  "review_research_consent",
  "review_checkin_trigger"
]);

let _privy: PrivyClient | null = null;
function getPrivy(): PrivyClient | null {
  if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) return null;
  if (!_privy) _privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);
  return _privy;
}

let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (!_client) {
    if (!SIGNER_KEY) throw new Error("GENLAYER_PRIVATE_KEY is not set on the server");
    if (!CONTRACT) throw new Error("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not set");
    const account = createAccount(SIGNER_KEY as `0x${string}`);
    _client = createClient({ chain: studionet, endpoint: ENDPOINT, account });
  }
  return _client;
}

// Fire-and-forget submission. We sign + broadcast the transaction, then
// return the hash immediately so the client can persist it to localStorage
// and poll /api/tx/<hash> for the verdict. This is the only flow that
// survives a page refresh - Studionet consensus takes 60-120 s and we
// can't keep an HTTP request alive that long without losing it on reload.
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return NextResponse.json({ error: "missing bearer token" }, { status: 401 });

    const privy = getPrivy();
    if (!privy) return NextResponse.json({ error: "server auth not configured" }, { status: 500 });
    try {
      await privy.verifyAuthToken(token);
    } catch {
      return NextResponse.json({ error: "invalid auth token" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "bad request body" }, { status: 400 });
    const { method, payload } = body as { method?: string; payload?: unknown };
    if (!method || !ALLOWED_METHODS.has(method)) return NextResponse.json({ error: "unknown method" }, { status: 400 });
    if (payload == null || typeof payload !== "object") return NextResponse.json({ error: "payload must be an object" }, { status: 400 });

    const client = getClient() as any;
    const hash = await client.writeContract({
      address: CONTRACT,
      functionName: method,
      args: [JSON.stringify(payload)],
      value: 0n
    });
    return NextResponse.json({ ok: true, hash });
  } catch (e: any) {
    const msg = String(e?.message || e).slice(0, 500);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
