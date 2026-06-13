// Bucket 3: non-deterministic functions (gl.eq_principle_prompt_comparative
// over gl.nondet.exec_prompt). All five write methods go through this path.
// Fresh inputs from suite 01 - independent round, own userHashes - to confirm
// the contract reaches ACCEPTED (not UNDETERMINED), returns valid JSON with
// every enum/range/shape constraint satisfied, and that the result persists
// and round-trips via the matching view function.
import { makeClient, writeWithRetry, readJson, Reporter } from "./_lib.mjs";

const RUN_ID = Date.now().toString(36) + "b";

export async function run() {
  const r = new Reporter("03-nondet-validation");
  const { client } = makeClient();

  // ---- wellness ----
  {
    const userHash = `user_e2e_${RUN_ID}_wellness`;
    const payload = {
      userHash,
      moodTrend: [7, 7, 8, 8], stressTrend: [3, 3, 2, 2], sleepTrend: [8, 8, 7, 8], energyTrend: [7, 8, 8, 8],
      missedGoals: 0, tags: ["exercise", "good_sleep"], journalSentiment: "uplifted",
      rawJournalIncluded: false, inputHash: `h_e2e_${RUN_ID}_wellness`
    };
    const { parsed, executionResult, reverted } = await writeWithRetry(client, "review_wellness_signal", payload);
    r.ok("wellness: reached ACCEPTED/SUCCESS (not UNDETERMINED)", !reverted && /SUCCESS|ACCEPTED/.test(executionResult), executionResult);
    r.ok("wellness: output is an object (valid JSON)", parsed && typeof parsed === "object");
    r.ok("wellness: riskLevel in allowed set", ["STEADY", "WATCH", "ELEVATED", "HIGH"].includes(parsed?.riskLevel), JSON.stringify(parsed).slice(0, 200));
    r.ok("wellness: score is integer 0..100", Number.isInteger(parsed?.score) && parsed.score >= 0 && parsed.score <= 100, `score=${parsed?.score}`);
    r.ok("wellness: checkInRecommended is boolean", typeof parsed?.checkInRecommended === "boolean");
    r.ok("wellness: signals is a non-empty array of strings", Array.isArray(parsed?.signals) && parsed.signals.length >= 1 && parsed.signals.every(s => typeof s === "string"));
    r.ok("wellness: recommendedActions is a non-empty array of strings", Array.isArray(parsed?.recommendedActions) && parsed.recommendedActions.length >= 1 && parsed.recommendedActions.every(s => typeof s === "string"));
    r.ok("wellness: safetyNote is a non-empty string", typeof parsed?.safetyNote === "string" && parsed.safetyNote.length > 0);

    const persisted = await readJson(client, "get_review", [parsed?.reviewId]);
    r.ok("wellness: persisted record round-trips", persisted?.reviewId === parsed?.reviewId);
    let reasoning = null;
    try { reasoning = JSON.parse(persisted?.reasoning ?? ""); } catch {}
    r.ok("wellness: persisted reasoning is valid JSON", reasoning !== null, persisted?.reasoning);
    let recs = null;
    try { recs = JSON.parse(persisted?.recommendations ?? ""); } catch {}
    r.ok("wellness: persisted recommendations is a valid JSON array", Array.isArray(recs), persisted?.recommendations);
  }

  // ---- goal ----
  {
    const userHash = `user_e2e_${RUN_ID}_goal`;
    const payload = {
      userHash, goalTitle: "Take a 10 minute walk daily", goalCategory: "movement",
      targetCount: 7, claimedCount: 2, evidenceSummary: "Only managed two walks this week, got busy with work travel.",
      checklistCompleted: false, rawJournalIncluded: false
    };
    const { parsed, executionResult, reverted } = await writeWithRetry(client, "review_goal_accountability", payload);
    const allowed = ["COMPLETED", "PARTIAL", "INSUFFICIENT_EVIDENCE", "MISSED", "NEEDS_MORE_CONTEXT"];
    r.ok("goal: reached ACCEPTED/SUCCESS (not UNDETERMINED)", !reverted && /SUCCESS|ACCEPTED/.test(executionResult), executionResult);
    r.ok("goal: output is an object (valid JSON)", parsed && typeof parsed === "object");
    r.ok("goal: outcome in allowed set", allowed.includes(parsed?.outcome), JSON.stringify(parsed).slice(0, 200));
    r.ok("goal: confidence is number in [0,1]", typeof parsed?.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1);
    r.ok("goal: reasoning is a non-empty string", typeof parsed?.reasoning === "string" && parsed.reasoning.length > 0);
    r.ok("goal: nextStep is a non-empty string", typeof parsed?.nextStep === "string" && parsed.nextStep.length > 0);
    // 2/7 with checklistCompleted=false is clearly not a full completion.
    r.ok("goal: under-delivery is not classified COMPLETED", parsed?.outcome !== "COMPLETED", JSON.stringify(parsed).slice(0, 200));

    const persisted = await readJson(client, "get_review", [parsed?.reviewId]);
    r.ok("goal: persisted verdict matches outcome", persisted?.verdict === parsed?.outcome);
  }

  // ---- reply (crisis language -> must not be visible) ----
  {
    const userHash = `user_e2e_${RUN_ID}_reply`;
    const payload = {
      userHash, circleAlias: "PaleFern",
      replyText: "I don't see the point anymore and I've been thinking about ending it all.",
      contextType: "support_circle"
    };
    const { parsed, executionResult, reverted } = await writeWithRetry(client, "review_support_reply", payload);
    const allowed = ["SUPPORTIVE", "NEUTRAL", "UNSAFE", "MEDICAL_ADVICE", "CRISIS_LANGUAGE"];
    r.ok("reply: reached ACCEPTED/SUCCESS (not UNDETERMINED)", !reverted && /SUCCESS|ACCEPTED/.test(executionResult), executionResult);
    r.ok("reply: classification in allowed set", allowed.includes(parsed?.classification), JSON.stringify(parsed).slice(0, 200));
    r.ok("reply: classified as CRISIS_LANGUAGE", parsed?.classification === "CRISIS_LANGUAGE", JSON.stringify(parsed).slice(0, 200));
    r.ok("reply: visible is boolean", typeof parsed?.visible === "boolean");
    r.ok("reply: qualityBadge is boolean", typeof parsed?.qualityBadge === "boolean");
    r.ok("reply: reasoning is a non-empty string", typeof parsed?.reasoning === "string" && parsed.reasoning.length > 0);

    const persisted = await readJson(client, "get_review", [parsed?.reviewId]);
    r.ok("reply: persisted verdict matches classification", persisted?.verdict === parsed?.classification);
    r.ok("reply: persisted confidence is high for crisis classification", persisted?.confidence >= 0.9, `confidence=${persisted?.confidence}`);
  }

  // ---- consent (request that asks for forbidden categories -> high risk) ----
  {
    const payload = {
      title: `Mood + Journal Export ${RUN_ID}`, requestingEntity: "Third-party analytics partner",
      dataRequested: ["journal text", "exact location", "email address"],
      dataNotRequested: [],
      durationDays: 365, revocable: false
    };
    const { parsed, executionResult, reverted } = await writeWithRetry(client, "review_research_consent", payload);
    const statuses = ["CLEAR", "NEEDS_REVISION", "HIGH_PRIVACY_RISK", "REJECTED"];
    r.ok("consent: reached ACCEPTED/SUCCESS (not UNDETERMINED)", !reverted && /SUCCESS|ACCEPTED/.test(executionResult), executionResult);
    r.ok("consent: status in allowed set", statuses.includes(parsed?.status), JSON.stringify(parsed).slice(0, 200));
    r.ok("consent: privacyRisk in allowed set", ["LOW", "MEDIUM", "HIGH"].includes(parsed?.privacyRisk));
    r.ok("consent: flagged as high privacy risk", parsed?.privacyRisk === "HIGH" || parsed?.status === "REJECTED" || parsed?.status === "HIGH_PRIVACY_RISK", JSON.stringify(parsed).slice(0, 200));
    r.ok("consent: status is not CLEAR for this request", parsed?.status !== "CLEAR", JSON.stringify(parsed).slice(0, 200));
    r.ok("consent: requiredUserSummary is a non-empty string", typeof parsed?.requiredUserSummary === "string" && parsed.requiredUserSummary.length > 0);

    const persisted = await readJson(client, "get_review", [parsed?.reviewId]);
    r.ok("consent: persisted verdict matches status", persisted?.verdict === parsed?.status);
    let reasoningObj = null;
    try { reasoningObj = JSON.parse(persisted?.reasoning ?? ""); } catch {}
    r.ok("consent: persisted reasoning carries privacyRisk", reasoningObj?.privacyRisk === parsed?.privacyRisk, persisted?.reasoning);
  }

  // ---- checkin ----
  {
    const userHash = `user_e2e_${RUN_ID}_checkin`;
    const payload = {
      userHash, riskLevel: "STEADY",
      recentMoodAvg: 7.5, recentStressAvg: 3, missedGoals: 0, preferredTone: "motivational"
    };
    const { parsed, executionResult, reverted } = await writeWithRetry(client, "review_checkin_trigger", payload);
    const tones = ["gentle", "direct", "reflective", "practical", "motivational"];
    r.ok("checkin: reached ACCEPTED/SUCCESS (not UNDETERMINED)", !reverted && /SUCCESS|ACCEPTED/.test(executionResult), executionResult);
    r.ok("checkin: shouldTrigger is boolean", typeof parsed?.shouldTrigger === "boolean", JSON.stringify(parsed).slice(0, 200));
    r.ok("checkin: tone in allowed set", tones.includes(parsed?.tone));
    r.ok("checkin: reason is a non-empty string", typeof parsed?.reason === "string" && parsed.reason.length > 0);
    r.ok("checkin: checkinPrompt is a non-empty string", typeof parsed?.checkinPrompt === "string" && parsed.checkinPrompt.length > 0);
    r.ok("checkin: disclaimer matches required wording", parsed?.disclaimer === "This is a wellness reflection, not medical advice, therapy, diagnosis, or crisis support.", parsed?.disclaimer);

    const expectedVerdict = parsed?.shouldTrigger ? "TRIGGER" : "SKIP";
    const persisted = await readJson(client, "get_review", [parsed?.reviewId]);
    r.ok("checkin: persisted verdict matches shouldTrigger mapping", persisted?.verdict === expectedVerdict, `stored=${persisted?.verdict} expected=${expectedVerdict}`);
  }

  return r.summary();
}

if (process.argv[1] && process.argv[1].endsWith("03-nondet-validation.mjs")) {
  run().then(s => process.exit(s.fail > 0 ? 1 : 0)).catch(e => { console.error("FATAL:", e); process.exit(2); });
}
