# Eunoia

**Private wellness accountability, powered by AI consensus.**

Eunoia is a GenLayer-native private wellness accountability platform. It uses real GenLayer Studionet consensus to review subjective wellness events: mood signals, goal evidence, support-circle replies, research consent requests, and AI check-in triggers.

## What Eunoia is

- A private wellness accountability tool.
- A GenLayer-native product whose review logic runs through one intelligent contract (`EunoiaConsensus`).
- A local-first app: raw notes, names, emails, and therapy notes never leave the device.

## What Eunoia is not

- Not medical care, not therapy, not diagnosis, not crisis support.
- Not a token, NFT, DeFi, wallet, or trading product.
- Not a Firebase/Supabase wellness SaaS.
- Not powered by any external AI (OpenAI, Anthropic, Gemini, etc).

## Why GenLayer

Eunoia's core decisions are subjective and cannot be answered by deterministic CRUD logic:

- Is the user's wellness signal STEADY, WATCH, ELEVATED, or HIGH?
- Does goal evidence reasonably support completion?
- Is a support-circle reply safe and supportive?
- Is a research consent request clear and privacy-safe?
- Should a bounded check-in be triggered, and in what tone?

GenLayer validators perform meaningful non-deterministic consensus judgement over reduced signal bundles.

## What GenLayer judges

- `review_wellness_signal()` - classify reduced wellness bundle.
- `review_goal_accountability()` - judge whether evidence supports the commitment.
- `review_support_reply()` - classify reply safety and quality.
- `review_research_consent()` - review clarity and privacy risk of consent requests.
- `review_checkin_trigger()` - decide whether to show a bounded check-in.

## What private data is withheld

Raw journal text, name, email, exact location, therapy notes, and medical records are never included in any GenLayer payload. The Privacy Vault page and the Consensus Playground both make this explicit.

## How signal bundles work

`lib/genlayer/signalBundler.ts` reads local mood/sleep/energy logs, checks Privacy Vault permissions, removes raw notes, summarises only allowed categories, and produces a deterministic JSON bundle with `inputHash` and a `withheld` list for the UI.

## How to run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs at http://localhost:3000.

By default `NEXT_PUBLIC_USE_MOCK_GENLAYER=true` is on so the project is fully runnable without a configured Studionet endpoint. The mock lives only in `lib/genlayer/mockDevResponses.ts` and is clearly labelled as a development fallback.

## How to configure GenLayer Studionet

Set these in `.env.local`:

```
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=<EunoiaConsensus address>
GENLAYER_PRIVATE_KEY=<signer key>
GENLAYER_RPC_URL=<Studionet RPC URL>
NEXT_PUBLIC_USE_MOCK_GENLAYER=false
```

Once these are set, the API routes under `app/api/genlayer/*` will call the real contract.

## How the Consensus Playground works

Open `/playground` and press **Run Consensus Demo**. The page shows:

1. Session - local private mode and GenLayer connection status.
2. Intelligent Contract Methods - all required methods on `EunoiaConsensus`.
3. Reduced Signal Bundle - the exact JSON sent to GenLayer.
4. Data Withheld - what is never sent.
5. Validator Trace - per-validator vote, confidence, and latency.
6. Consensus Output - the structured verdict.
7. Event Console - a live trace from this device.

## Safety disclaimer

Eunoia is a wellness accountability product. It does not provide medical diagnosis, therapy, treatment, crisis support, or emergency care. If you may be in immediate danger, contact local emergency services or someone you trust immediately. Eunoia detects crisis language and stops normal coaching when it appears.

## No external AI

There is no OpenAI, Anthropic, Gemini, or any other external LLM call anywhere in the codebase. The only AI-style judgement comes from GenLayer Studionet consensus, with a clearly labelled local mock as a development fallback.

## No token / credit statement

There are no tokens, credits, wallet-connect flows, MetaMask integrations, NFTs, swaps, yield, APY, or trading anywhere in the product. Wellness commitments are personal, not financial.

## No Firebase / Supabase

All data lives in `localStorage`/`IndexedDB` on the user's device. There is no external database.

## Demo walkthrough

1. Open the landing page and press **Enter Eunoia**.
2. Go to **Mood Signals**, log a low-mood / high-stress entry, and watch the reduced signal bundle generate.
3. Submit and see the GenLayer review (risk level, signals, recommended actions).
4. Open **AI Check-in** and run a bounded reflection.
5. Open **Commitments**, create a commitment, submit evidence, and review the verdict.
6. Open **Support Circles**, write a reply, and see GenLayer classify it.
7. Open **Privacy Vault** and change a permission from `GENLAYER_REVIEW_ONLY` to `PRIVATE`. Re-run the mood flow and observe the bundle excluding that category.
8. Open **Research Consent**, build a request, and run a consent review.
9. Open the **Consensus Playground** and press **Run Consensus Demo**.

## Why this is GenLayer-native

Every product loop ends at a GenLayer review. Eunoia uses GenLayer for subjective wellness accountability judgements that cannot be solved with deterministic CRUD logic. The Consensus Feed and Consensus Playground make this visible at all times.
