# EunoiaConsensus - GenLayer intelligent contract

This directory holds the deployable artifact: one Python intelligent contract that exposes the five review methods plus three read helpers required by Eunoia.

## File

- `EunoiaConsensus.py` - the contract. Stores only review-level metadata. Never accepts or stores raw journal text, name, email, location, therapy notes, or medical records. Defensive `pop()` calls drop any forbidden fields a misbehaving client might send.

## Methods

Write (consensus):

- `review_wellness_signal(signal_bundle_json)`
- `review_goal_accountability(evidence_json)`
- `review_support_reply(reply_json)`
- `review_research_consent(consent_json)`
- `review_checkin_trigger(checkin_json)`

Read (view):

- `get_review(review_id)`
- `get_user_reviews(user_hash)`
- `get_protocol_stats()`

Each write method:

1. Strips any forbidden fields.
2. Builds a prompt that includes the shared `SAFETY_FRAME` (non-medical, non-therapy, JSON-only).
3. Runs `gl.eq_principle_prompt_comparative` so validators only need to agree on the verdict semantics, not on every byte of text.
4. Records a `ReviewRecord` on-chain (review id, user hash, input hash, verdict, confidence, structured reasoning, recommendations, timestamp).
5. Returns the parsed JSON with the `reviewId` attached.

## Deploy to GenLayer Studionet

Use the GenLayer Studio (https://studio.genlayer.com) or the `genlayer` CLI.

### Option A - Studio UI

1. Open Studio, switch network to **Studionet**.
2. Create a new contract, paste the contents of `EunoiaConsensus.py`.
3. Deploy. No constructor args.
4. Copy the resulting contract address.

### Option B - CLI

```bash
pip install genlayer-cli
genlayer deploy contracts/EunoiaConsensus.py --network studionet
```

## Wire it into the app

Edit `.env.local` in the project root:

```
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x<your contract address>
GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_PRIVATE_KEY=0x<a funded Studionet signer key>
NEXT_PUBLIC_USE_MOCK_GENLAYER=false
```

Then restart `npm run dev`. The five `/api/genlayer/review-*` routes will switch from the local dev mock to real Studionet calls. The Settings page and the topbar both show the current connection mode.

## Plugging in `genlayer-js`

`lib/genlayer/client.ts` is intentionally written so the SDK call sits in one place. If you use the official `genlayer-js` SDK, install it and replace the body of `callContract` with:

```ts
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const account = createAccount(process.env.GENLAYER_PRIVATE_KEY!);
const client = createClient({ chain: studionet, endpoint: process.env.GENLAYER_RPC_URL!, account });

const tx = await client.writeContract({
  address: process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS as `0x${string}`,
  functionName: method,
  args: [JSON.stringify(payload)],
});
const receipt = await client.waitForTransactionReceipt({ hash: tx });
return JSON.parse(receipt.consensus_data.leader_receipt.result);
```

The exact SDK surface evolves - check the version installed in your environment before pasting.

## Why this is safe by construction

- Every prompt starts with `SAFETY_FRAME` so validators are reminded they are not medical professionals on every call.
- Output schemas are pinned in the prompt; the contract still validates the verdict against an allowed set before recording.
- Forbidden fields are stripped server-side in the contract as a second line of defence, even if the client somehow sent them.
- Reviews are stored as structured records; nothing free-form from the user's private notes ever lands on-chain.
