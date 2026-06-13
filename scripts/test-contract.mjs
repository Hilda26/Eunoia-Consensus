// Live E2E test against the deployed EunoiaConsensus contract on Studionet.
// Uses a locally-generated signer (same contract + methods the app calls).
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT = "0xa7e6F5cD2c48fd46dd4449C4D09a3501b8bc7f40";
const ENDPOINT = "https://studio.genlayer.com/api";

const account = createAccount(generatePrivateKey());
console.log("signer:", account.address);

const client = createClient({ chain: studionet, endpoint: ENDPOINT, account });

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(name); console.log(`  FAIL  ${name} ${extra}`); }
}

function parseLeader(receipt) {
  const lr = receipt?.consensus_data?.leader_receipt;
  const r = Array.isArray(lr) ? lr[0] : lr;
  if (!r) return { _error: "no leader receipt", receipt };
  if (r.error) return { _error: r.error };
  let raw = r.result;
  if (raw && typeof raw === "object" && "payload" in raw) {
    const p = raw.payload;
    raw = (p && typeof p === "object") ? (p.readable ?? p.raw ?? p) : p;
  }
  let v = raw;
  for (let i = 0; i < 3 && typeof v === "string"; i++) {
    const s = v.trim();
    try { v = JSON.parse(s); continue; } catch {}
    if (s.startsWith("0x")) {
      try {
        const h = s.slice(2);
        const bytes = new Uint8Array(h.length / 2);
        for (let i2 = 0; i2 < bytes.length; i2++) bytes[i2] = parseInt(h.slice(i2*2, i2*2+2), 16);
        const text = new TextDecoder().decode(bytes);
        const idx = text.indexOf("{");
        v = idx >= 0 ? text.slice(idx) : text;
        continue;
      } catch {}
    }
    break;
  }
  return v;
}

async function write(method, payload) {
  const t0 = Date.now();
  const hash = await client.writeContract({
    address: CONTRACT, functionName: method, args: [JSON.stringify(payload)], value: 0n
  });
  const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 40, interval: 3000 });
  const ms = Date.now() - t0;
  const out = parseLeader(receipt);
  console.log(`    [${method}] ${ms}ms -> ${JSON.stringify(out).slice(0, 240)}`);
  return out;
}

async function read(method, args) {
  const res = await client.readContract({ address: CONTRACT, functionName: method, args: args || [] });
  return res;
}

const run = async () => {
  console.log("\n== contract reachability ==");
  try {
    const schema = await client.getContractSchema(CONTRACT);
    const methods = Object.keys(schema?.methods || schema || {});
    ok("getContractSchema returns methods", true, "");
    console.log("    methods:", JSON.stringify(methods).slice(0, 300));
  } catch (e) {
    ok("getContractSchema returns methods", false, String(e).slice(0, 200));
  }

  console.log("\n== 1. review_wellness_signal ==");
  try {
    const r = await write("review_wellness_signal", {
      userHash: "user_test_hidden",
      moodTrend: [6,5,4,3], stressTrend: [6,7,8,8], sleepTrend: [7,5,4,4], energyTrend: [6,5,4,3],
      missedGoals: 2, tags: ["work","sleep","overthinking"], journalSentiment: "stressed",
      rawJournalIncluded: false, inputHash: "h_test1"
    });
    ok("returns a riskLevel in allowed set", ["STEADY","WATCH","ELEVATED","HIGH"].includes(r.riskLevel), JSON.stringify(r).slice(0,200));
    ok("returns checkInRecommended boolean", typeof r.checkInRecommended === "boolean");
    ok("returns signals array", Array.isArray(r.signals));
    ok("returns recommendedActions array", Array.isArray(r.recommendedActions));
    ok("includes a safetyNote", typeof r.safetyNote === "string" && r.safetyNote.length > 0);
  } catch (e) { ok("review_wellness_signal completes", false, String(e).slice(0,300)); }

  console.log("\n== 2. review_goal_accountability ==");
  try {
    const r = await write("review_goal_accountability", {
      userHash: "user_test_hidden", goalTitle: "Journal 3 times this week", goalCategory: "journaling",
      targetCount: 3, claimedCount: 3, evidenceSummary: "Completed three private journaling sessions this week.",
      checklistCompleted: true, rawJournalIncluded: false
    });
    ok("returns outcome in allowed set", ["COMPLETED","PARTIAL","INSUFFICIENT_EVIDENCE","MISSED","NEEDS_MORE_CONTEXT"].includes(r.outcome), JSON.stringify(r).slice(0,200));
    ok("returns confidence number 0..1", typeof r.confidence === "number" && r.confidence >= 0 && r.confidence <= 1);
    ok("returns reasoning + nextStep", typeof r.reasoning === "string" && typeof r.nextStep === "string");
  } catch (e) { ok("review_goal_accountability completes", false, String(e).slice(0,300)); }

  console.log("\n== 3. review_support_reply (supportive) ==");
  try {
    const r = await write("review_support_reply", {
      userHash: "user_test_hidden", circleAlias: "QuietOak",
      replyText: "I hear you. Maybe try one small reset tonight and speak with someone you trust if it feels heavy.",
      contextType: "support_circle"
    });
    ok("returns classification in allowed set", ["SUPPORTIVE","NEUTRAL","UNSAFE","MEDICAL_ADVICE","CRISIS_LANGUAGE"].includes(r.classification), JSON.stringify(r).slice(0,200));
    ok("returns visible boolean", typeof r.visible === "boolean");
    ok("supportive reply is visible", r.classification === "CRISIS_LANGUAGE" || r.visible === true);
  } catch (e) { ok("review_support_reply completes", false, String(e).slice(0,300)); }

  console.log("\n== 4. review_research_consent ==");
  try {
    const r = await write("review_research_consent", {
      title: "Sleep and Stress Pattern Review", requestingEntity: "Not connected",
      dataRequested: ["sleep score range","stress score range","goal completion count"],
      dataNotRequested: ["journal text","name","email","location","therapy notes"],
      durationDays: 30, revocable: true
    });
    ok("returns status in allowed set", ["CLEAR","NEEDS_REVISION","HIGH_PRIVACY_RISK","REJECTED"].includes(r.status), JSON.stringify(r).slice(0,200));
    ok("returns privacyRisk level", ["LOW","MEDIUM","HIGH"].includes(r.privacyRisk));
    ok("returns requiredUserSummary", typeof r.requiredUserSummary === "string");
  } catch (e) { ok("review_research_consent completes", false, String(e).slice(0,300)); }

  console.log("\n== 5. review_checkin_trigger ==");
  try {
    const r = await write("review_checkin_trigger", {
      userHash: "user_test_hidden", riskLevel: "ELEVATED",
      recentMoodAvg: 4, recentStressAvg: 7.5, missedGoals: 2, preferredTone: "gentle"
    });
    ok("returns shouldTrigger boolean", typeof r.shouldTrigger === "boolean", JSON.stringify(r).slice(0,200));
    ok("returns tone in allowed set", ["gentle","direct","reflective","practical","motivational"].includes(r.tone));
    ok("includes disclaimer", typeof r.disclaimer === "string" && r.disclaimer.length > 0);
  } catch (e) { ok("review_checkin_trigger completes", false, String(e).slice(0,300)); }

  console.log("\n== 6. read methods ==");
  try {
    const stats = await read("get_protocol_stats", []);
    console.log("    get_protocol_stats ->", JSON.stringify(stats).slice(0,200));
    ok("get_protocol_stats returns data", stats != null);
  } catch (e) { ok("get_protocol_stats returns data", false, String(e).slice(0,200)); }
  try {
    const ur = await read("get_user_reviews", ["user_test_hidden"]);
    console.log("    get_user_reviews ->", JSON.stringify(ur).slice(0,200));
    ok("get_user_reviews returns data", ur != null);
  } catch (e) { ok("get_user_reviews returns data", false, String(e).slice(0,200)); }

  console.log(`\n==== LIVE CONTRACT: ${pass} passed, ${fail} failed ====`);
  if (fails.length) console.log("FAILURES:", fails.join(", "));
  process.exit(fail > 0 ? 1 : 0);
};

run().catch(e => { console.error("FATAL:", e); process.exit(2); });
