// Bucket 1: deterministic happy path.
// Walk every write method with valid input from the intended caller, then
// read back on-chain state (get_protocol_stats / get_user_reviews / get_review)
// and assert the stored record matches the consensus verdict.
import { makeClient, writeWithRetry, readJson, Reporter } from "./_lib.mjs";

const RUN_ID = Date.now().toString(36);

export async function run() {
  const r = new Reporter("01-happy-path");
  const { client } = makeClient();

  const statsBefore = await readJson(client, "get_protocol_stats", []);
  console.log(`  stats before: ${JSON.stringify(statsBefore)}`);

  // ---- 1. review_wellness_signal ----
  {
    const userHash = `user_e2e_${RUN_ID}_wellness`;
    const payload = {
      userHash,
      moodTrend: [6, 5, 4, 3], stressTrend: [6, 7, 8, 8], sleepTrend: [7, 5, 4, 4], energyTrend: [6, 5, 4, 3],
      missedGoals: 2, tags: ["work", "sleep", "overthinking"], journalSentiment: "stressed",
      rawJournalIncluded: false, inputHash: `h_e2e_${RUN_ID}_wellness`
    };
    const { parsed, reverted } = await writeWithRetry(client, "review_wellness_signal", payload);
    r.ok("wellness: did not revert", !reverted);
    r.ok("wellness: riskLevel in allowed set", ["STEADY", "WATCH", "ELEVATED", "HIGH"].includes(parsed?.riskLevel), JSON.stringify(parsed).slice(0, 200));
    r.ok("wellness: reviewId present", typeof parsed?.reviewId === "string" && parsed.reviewId.startsWith("rev_wellness_"));

    const userReviews = await readJson(client, "get_user_reviews", [userHash]);
    r.ok("wellness: get_user_reviews returns array with 1 entry", Array.isArray(userReviews) && userReviews.length === 1, JSON.stringify(userReviews).slice(0, 200));
    const rec = userReviews?.[0];
    r.ok("wellness: stored reviewId matches", rec?.reviewId === parsed?.reviewId);
    r.ok("wellness: stored reviewType is 'wellness'", rec?.reviewType === "wellness");
    r.ok("wellness: stored verdict matches riskLevel", rec?.verdict === parsed?.riskLevel);
    r.ok("wellness: stored userHash matches", rec?.userHash === userHash);

    const single = await readJson(client, "get_review", [parsed?.reviewId]);
    r.ok("wellness: get_review returns same record", single?.reviewId === parsed?.reviewId && single?.verdict === parsed?.riskLevel);
  }

  // ---- 2. review_goal_accountability ----
  {
    const userHash = `user_e2e_${RUN_ID}_goal`;
    const payload = {
      userHash, goalTitle: "Journal 3 times this week", goalCategory: "journaling",
      targetCount: 3, claimedCount: 3, evidenceSummary: "Completed three private journaling sessions this week.",
      checklistCompleted: true, rawJournalIncluded: false
    };
    const { parsed, reverted } = await writeWithRetry(client, "review_goal_accountability", payload);
    r.ok("goal: did not revert", !reverted);
    const allowed = ["COMPLETED", "PARTIAL", "INSUFFICIENT_EVIDENCE", "MISSED", "NEEDS_MORE_CONTEXT"];
    r.ok("goal: outcome in allowed set", allowed.includes(parsed?.outcome), JSON.stringify(parsed).slice(0, 200));
    r.ok("goal: confidence in [0,1]", typeof parsed?.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1);

    const userReviews = await readJson(client, "get_user_reviews", [userHash]);
    const rec = userReviews?.[0];
    r.ok("goal: get_user_reviews returns 1 entry", Array.isArray(userReviews) && userReviews.length === 1);
    r.ok("goal: stored reviewType is 'goal'", rec?.reviewType === "goal");
    r.ok("goal: stored verdict matches outcome", rec?.verdict === parsed?.outcome);
    r.ok("goal: stored confidence matches (within float tolerance)", Math.abs((rec?.confidence ?? -1) - parsed?.confidence) < 1e-6, `stored=${rec?.confidence} parsed=${parsed?.confidence}`);
  }

  // ---- 3. review_support_reply ----
  {
    const userHash = `user_e2e_${RUN_ID}_reply`;
    const payload = {
      userHash, circleAlias: "QuietOak",
      replyText: "I hear you. Maybe try one small reset tonight and speak with someone you trust if it feels heavy.",
      contextType: "support_circle"
    };
    const { parsed, reverted } = await writeWithRetry(client, "review_support_reply", payload);
    r.ok("reply: did not revert", !reverted);
    const allowed = ["SUPPORTIVE", "NEUTRAL", "UNSAFE", "MEDICAL_ADVICE", "CRISIS_LANGUAGE"];
    r.ok("reply: classification in allowed set", allowed.includes(parsed?.classification), JSON.stringify(parsed).slice(0, 200));
    r.ok("reply: visible is boolean", typeof parsed?.visible === "boolean");

    const userReviews = await readJson(client, "get_user_reviews", [userHash]);
    const rec = userReviews?.[0];
    r.ok("reply: stored reviewType is 'reply'", rec?.reviewType === "reply");
    r.ok("reply: stored verdict matches classification", rec?.verdict === parsed?.classification);
  }

  // ---- 4. review_research_consent ----
  // Note: contract hardcodes user_hash="user_consent_request" for this type,
  // so we look it up via get_user_reviews on that fixed hash and find our record
  // by reviewId instead of by a per-run user hash.
  {
    const payload = {
      title: `Sleep and Stress Pattern Review ${RUN_ID}`, requestingEntity: "Not connected",
      dataRequested: ["sleep score range", "stress score range", "goal completion count"],
      dataNotRequested: ["journal text", "name", "email", "location", "therapy notes"],
      durationDays: 30, revocable: true
    };
    const { parsed, reverted } = await writeWithRetry(client, "review_research_consent", payload);
    r.ok("consent: did not revert", !reverted);
    const allowed = ["CLEAR", "NEEDS_REVISION", "HIGH_PRIVACY_RISK", "REJECTED"];
    r.ok("consent: status in allowed set", allowed.includes(parsed?.status), JSON.stringify(parsed).slice(0, 200));
    r.ok("consent: privacyRisk in allowed set", ["LOW", "MEDIUM", "HIGH"].includes(parsed?.privacyRisk));
    r.ok("consent: requiredUserSummary non-empty string", typeof parsed?.requiredUserSummary === "string" && parsed.requiredUserSummary.length > 0);

    const single = await readJson(client, "get_review", [parsed?.reviewId]);
    r.ok("consent: get_review returns same record", single?.reviewId === parsed?.reviewId);
    r.ok("consent: stored reviewType is 'consent'", single?.reviewType === "consent");
    r.ok("consent: stored userHash is fixed 'user_consent_request'", single?.userHash === "user_consent_request");
    r.ok("consent: stored verdict matches status", single?.verdict === parsed?.status);
  }

  // ---- 5. review_checkin_trigger ----
  {
    const userHash = `user_e2e_${RUN_ID}_checkin`;
    const payload = {
      userHash, riskLevel: "ELEVATED",
      recentMoodAvg: 4, recentStressAvg: 7.5, missedGoals: 2, preferredTone: "gentle"
    };
    const { parsed, reverted } = await writeWithRetry(client, "review_checkin_trigger", payload);
    r.ok("checkin: did not revert", !reverted);
    r.ok("checkin: shouldTrigger is boolean", typeof parsed?.shouldTrigger === "boolean", JSON.stringify(parsed).slice(0, 200));
    const tones = ["gentle", "direct", "reflective", "practical", "motivational"];
    r.ok("checkin: tone in allowed set", tones.includes(parsed?.tone));
    r.ok("checkin: disclaimer present", typeof parsed?.disclaimer === "string" && parsed.disclaimer.length > 0);

    const userReviews = await readJson(client, "get_user_reviews", [userHash]);
    const rec = userReviews?.[0];
    const expectedVerdict = parsed?.shouldTrigger ? "TRIGGER" : "SKIP";
    r.ok("checkin: stored reviewType is 'checkin'", rec?.reviewType === "checkin");
    r.ok("checkin: stored verdict matches shouldTrigger mapping", rec?.verdict === expectedVerdict, `stored=${rec?.verdict} expected=${expectedVerdict}`);
  }

  // ---- protocol stats counters ----
  const statsAfter = await readJson(client, "get_protocol_stats", []);
  console.log(`  stats after: ${JSON.stringify(statsAfter)}`);
  r.ok("totalReviews incremented by 5", statsAfter.totalReviews === statsBefore.totalReviews + 5, `before=${statsBefore.totalReviews} after=${statsAfter.totalReviews}`);
  r.ok("byType.wellness incremented by 1", statsAfter.byType.wellness === statsBefore.byType.wellness + 1);
  r.ok("byType.goal incremented by 1", statsAfter.byType.goal === statsBefore.byType.goal + 1);
  r.ok("byType.reply incremented by 1", statsAfter.byType.reply === statsBefore.byType.reply + 1);
  r.ok("byType.consent incremented by 1", statsAfter.byType.consent === statsBefore.byType.consent + 1);
  r.ok("byType.checkin incremented by 1", statsAfter.byType.checkin === statsBefore.byType.checkin + 1);

  return r.summary();
}

if (process.argv[1] && process.argv[1].endsWith("01-happy-path.mjs")) {
  run().then(s => process.exit(s.fail > 0 ? 1 : 0)).catch(e => { console.error("FATAL:", e); process.exit(2); });
}
