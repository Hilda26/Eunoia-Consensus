// E2E pipeline logic test - exercises the real app source (no mocks).
import { buildSignalBundle } from "@/lib/genlayer/signalBundler";
import { isAllowedForReview, withheldList, describeLevel } from "@/lib/eunoia/privacyVault";
import { detectCrisisLanguage, detectMedicalAdvice, getSafetyResponse, appendMedicalDisclaimer, validateNonMedicalCopy } from "@/lib/eunoia/safety";
import { userHashFromAlias, hashStable } from "@/lib/utils/format";
import { defaultPermissions } from "@/lib/eunoia/localStore";
import type { MoodLog, Commitment, DataCategory, PermissionLevel } from "@/types";

let pass = 0, fail = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(name); console.log(`  FAIL  ${name} ${extra}`); }
}

const logs: MoodLog[] = [
  { id: "m1", ts: Date.now() - 3 * 86400000, mood: 6, stress: 6, anxiety: 4, energy: 6, sleep: 7, note: "ok", tags: ["work"] },
  { id: "m2", ts: Date.now() - 2 * 86400000, mood: 5, stress: 7, anxiety: 5, energy: 5, sleep: 5, note: "tired", tags: ["work", "sleep"] },
  { id: "m3", ts: Date.now() - 1 * 86400000, mood: 4, stress: 8, anxiety: 6, energy: 4, sleep: 4, note: "rough", tags: ["overthinking"] },
  { id: "m4", ts: Date.now(), mood: 3, stress: 8, anxiety: 7, energy: 3, sleep: 4, note: "very rough", tags: ["burnout"] }
];
const commitments: Commitment[] = [
  { id: "c1", ts: Date.now(), title: "Journal 3x", category: "journaling", frequency: "weekly", target: 3, privacy: "GENLAYER_REVIEW_ONLY", accountability: "personal", evidenceType: "checklist", claimedCount: 1 }
];

console.log("\n== 1. Signal bundler: happy path ==");
const b1 = buildSignalBundle({ alias: "QuietOak", logs, commitments, permissions: { ...defaultPermissions } });
ok("userHash is hashed, not the alias", b1.userHash.startsWith("user_") && !b1.userHash.includes("QuietOak"));
ok("rawJournalIncluded is always false", b1.rawJournalIncluded === false);
ok("moodTrend has 4 recent points", b1.moodTrend.length === 4, JSON.stringify(b1.moodTrend));
ok("moodTrend is chronological (oldest->newest)", b1.moodTrend[0] === 6 && b1.moodTrend[3] === 3);
ok("missedGoals counts under-target commitments", b1.missedGoals === 1);
ok("inputHash is present and stable-prefixed", typeof b1.inputHash === "string" && b1.inputHash.startsWith("h_"));
ok("withheld list includes raw journal text", b1.withheld.includes("raw journal text"));
ok("withheld list includes name/email/location", b1.withheld.includes("name") && b1.withheld.includes("email") && b1.withheld.includes("exact location"));
ok("no raw note text leaks into bundle", !JSON.stringify(b1).includes("very rough") && !JSON.stringify(b1).includes("rough"));

console.log("\n== 2. Signal bundler: determinism ==");
const b1again = buildSignalBundle({ alias: "QuietOak", logs, commitments, permissions: { ...defaultPermissions } });
ok("same input -> same inputHash", b1.inputHash === b1again.inputHash);
const b1diff = buildSignalBundle({ alias: "DifferentAlias", logs, commitments, permissions: { ...defaultPermissions } });
ok("different alias -> different userHash", b1.userHash !== b1diff.userHash);

console.log("\n== 3. Privacy Vault gating (the core privacy guarantee) ==");
const priv: Record<DataCategory, PermissionLevel> = { ...defaultPermissions, MOOD_LOGS: "PRIVATE" };
const bPriv = buildSignalBundle({ alias: "QuietOak", logs, commitments, permissions: priv });
ok("MOOD_LOGS=PRIVATE -> moodTrend excluded", bPriv.moodTrend.length === 0, JSON.stringify(bPriv.moodTrend));
ok("MOOD_LOGS=PRIVATE -> stressTrend excluded", bPriv.stressTrend.length === 0);
ok("MOOD_LOGS=PRIVATE -> journalSentiment withheld", bPriv.journalSentiment === "withheld");
ok("MOOD_LOGS=PRIVATE -> withheld list shows mood trend", bPriv.withheld.includes("mood trend"));

const sleepOff: Record<DataCategory, PermissionLevel> = { ...defaultPermissions, SLEEP_DATA: "DISABLED" };
const bSleep = buildSignalBundle({ alias: "QuietOak", logs, commitments, permissions: sleepOff });
ok("SLEEP_DATA=DISABLED -> sleepTrend excluded", bSleep.sleepTrend.length === 0);
ok("SLEEP_DATA=DISABLED -> mood still present", bSleep.moodTrend.length === 4);

console.log("\n== 4. Privacy Vault helpers ==");
ok("GENLAYER_REVIEW_ONLY allowed for review", isAllowedForReview("GENLAYER_REVIEW_ONLY") === true);
ok("PRIVATE not allowed for review", isAllowedForReview("PRIVATE") === false);
ok("DISABLED not allowed for review", isAllowedForReview("DISABLED") === false);
ok("ANONYMISED_RESEARCH allowed for review", isAllowedForReview("ANONYMISED_RESEARCH") === true);
ok("describeLevel returns text for every level", ["PRIVATE","GENLAYER_REVIEW_ONLY","SUPPORT_CIRCLE_ALIAS","ANONYMISED_RESEARCH","DISABLED"].every(l => typeof describeLevel(l as PermissionLevel) === "string" && describeLevel(l as PermissionLevel).length > 0));

console.log("\n== 5. Safety: crisis + medical detection ==");
ok("detects 'kill myself'", detectCrisisLanguage("I want to kill myself") === true);
ok("detects 'suicidal'", detectCrisisLanguage("feeling suicidal lately") === true);
ok("detects 'self-harm'", detectCrisisLanguage("thoughts of self-harm") === true);
ok("does NOT flag normal sadness", detectCrisisLanguage("I feel a bit down today") === false);
ok("does NOT flag 'killing it at work'", detectCrisisLanguage("I am killing it at work") === false);
ok("detects medical 'diagnose'", detectMedicalAdvice("let me diagnose you") === true);
ok("detects 'you have depression'", detectMedicalAdvice("you have depression") === true);
ok("does NOT flag supportive copy", detectMedicalAdvice("I hear you, take a small break") === false);
ok("safety response is non-empty + non-clinical", getSafetyResponse().includes("emergency") && !getSafetyResponse().includes("diagnos"));
ok("appendMedicalDisclaimer attaches disclaimer", appendMedicalDisclaimer("hello").includes("not medical advice"));
ok("validateNonMedicalCopy rejects medical text", validateNonMedicalCopy("I will diagnose you").ok === false);
ok("validateNonMedicalCopy accepts safe text", validateNonMedicalCopy("be gentle with yourself").ok === true);

console.log("\n== 6. Hashing ==");
ok("hashStable deterministic", hashStable("abc") === hashStable("abc"));
ok("hashStable differs by input", hashStable("abc") !== hashStable("abd"));
ok("userHashFromAlias hides alias", !userHashFromAlias("SecretName").includes("SecretName"));

console.log(`\n==== PIPELINE LOGIC: ${pass} passed, ${fail} failed ====`);
if (fail > 0) { console.log("FAILURES:", fails.join(", ")); process.exit(1); }
