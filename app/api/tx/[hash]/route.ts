// Reads a Studionet transaction receipt directly from the chain via
// genlayer-js and returns a simplified shape the in-app /tx/<hash> page
// can render. Public on-chain data, so no Privy auth required.

import { NextRequest, NextResponse } from "next/server";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINT = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";

let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (!_client) {
    // A throwaway account; reads don't need a funded signer but the client
    // builder expects one.
    const account = createAccount(generatePrivateKey());
    _client = createClient({ chain: studionet, endpoint: ENDPOINT, account });
  }
  return _client;
}

function unwrapPayload(raw: any): any {
  if (raw && typeof raw === "object" && "payload" in raw) {
    const p = raw.payload;
    return (p && typeof p === "object") ? (p.readable ?? p.raw ?? p) : p;
  }
  return raw;
}

function tryDecode(v: any): any {
  let cur = v;
  for (let i = 0; i < 3 && typeof cur === "string"; i++) {
    const s = cur.trim();
    try { cur = JSON.parse(s); continue; } catch { /* not json */ }
    if (s.startsWith("0x")) {
      try {
        const h = s.slice(2);
        const bytes = new Uint8Array(h.length / 2);
        for (let j = 0; j < bytes.length; j++) bytes[j] = parseInt(h.slice(j * 2, j * 2 + 2), 16);
        const text = new TextDecoder().decode(bytes);
        const idx = text.indexOf("{");
        cur = idx >= 0 ? text.slice(idx) : text;
        continue;
      } catch { /* fall through */ }
    }
    break;
  }
  return cur;
}

export async function GET(_req: NextRequest, { params }: { params: { hash: string } }) {
  try {
    const hash = params.hash;
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      return NextResponse.json({ error: "invalid tx hash" }, { status: 400 });
    }
    const client = getClient() as any;
    const tx = await client.getTransaction({ hash });
    const leaders = tx?.consensus_data?.leader_receipt;
    const lr = Array.isArray(leaders) ? leaders[0] : leaders;
    const verdict = lr ? tryDecode(unwrapPayload(lr.result)) : null;

    const validatorReceipts = Array.isArray(tx?.consensus_data?.validators)
      ? tx.consensus_data.validators
      : (Array.isArray(tx?.consensus_data?.validator_receipts) ? tx.consensus_data.validator_receipts : []);

    return NextResponse.json({
      ok: true,
      hash,
      status: tx?.status || tx?.tx_status || "unknown",
      executionResult: lr?.execution_result || null,
      from: tx?.from_address || tx?.from || null,
      to: tx?.to_address || tx?.recipient || null,
      contract: tx?.to_address || tx?.recipient || null,
      method: tx?.data?.calldata?.method || tx?.data?.function_name || null,
      verdict,
      leaderError: lr?.error || null,
      leaderStderr: lr?.stderr || null,
      validatorCount: validatorReceipts.length,
      validatorVotes: validatorReceipts.map((v: any) => v?.vote || v?.execution_result || "?")
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e).slice(0, 500) }, { status: 500 });
  }
}
