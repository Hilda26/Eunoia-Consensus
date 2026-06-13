// Bucket 2: deterministic revert paths.
//
// EunoiaConsensus has no `raise VmUserError(...)` / `require` statements and
// no access control or phase checks - every @gl.public.write method does
// `json.loads(<arg>)` as its first step with no try/except. The only
// deterministic failure surface is malformed JSON input, which raises an
// unhandled json.decoder.JSONDecodeError inside the GenVM call. We assert
// that this surfaces as a non-SUCCESS execution_result on-chain (not just a
// thrown JS promise), and that no review record / counter is persisted.
import { makeClient, writeWithRetry, readJson, Reporter } from "./_lib.mjs";

const FUNCTIONS = [
  "review_wellness_signal",
  "review_goal_accountability",
  "review_support_reply",
  "review_research_consent",
  "review_checkin_trigger"
];

// writeWithRetry JSON.stringifies the payload before sending, so to actually
// deliver malformed JSON to the contract's json.loads() we send a plain
// string value (a valid JSON string literal once stringified, but its
// *content* is not valid JSON - matching what the contract receives as
// `signal_bundle_json` / `evidence_json` / etc).
const MALFORMED = "{not valid json, missing quotes and braces";

export async function run() {
  const r = new Reporter("02-revert-paths");
  const { client } = makeClient();

  for (const fn of FUNCTIONS) {
    const statsBefore = await readJson(client, "get_protocol_stats", []);
    const { reverted, executionResult, stderr, parsed } = await writeWithRetry(
      client, fn, MALFORMED, { expectFailure: true }
    );
    r.ok(`${fn}: malformed JSON reverts on-chain`, reverted === true, `executionResult=${executionResult} stderr=${stderr}`);
    // Note: Studionet leader receipts surface failure via execution_result=ERROR
    // but do not populate stderr for unhandled Python exceptions in this build,
    // so we assert revert + on-chain state unchanged rather than stderr text.

    const statsAfter = await readJson(client, "get_protocol_stats", []);
    r.ok(`${fn}: totalReviews unchanged after revert`, statsAfter.totalReviews === statsBefore.totalReviews, `before=${statsBefore.totalReviews} after=${statsAfter.totalReviews}`);
  }

  return r.summary();
}

if (process.argv[1] && process.argv[1].endsWith("02-revert-paths.mjs")) {
  run().then(s => process.exit(s.fail > 0 ? 1 : 0)).catch(e => { console.error("FATAL:", e); process.exit(2); });
}
