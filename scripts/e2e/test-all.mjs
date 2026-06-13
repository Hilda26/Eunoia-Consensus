// Runs the EunoiaConsensus E2E suite against Studionet: Step 0 sanity, then
// deterministic happy path, then revert paths, then non-det validation.
// Usage: node scripts/e2e/test-all.mjs [suite-name ...]
import { CONTRACT, ENDPOINT, CHAIN_ID } from "./_lib.mjs";
import { run as sanity } from "./00-sanity.mjs";
import { run as happyPath } from "./01-happy-path.mjs";
import { run as revertPaths } from "./02-revert-paths.mjs";
import { run as nondetValidation } from "./03-nondet-validation.mjs";

const ALL = [
  { name: "00-sanity", fn: sanity },
  { name: "01-happy-path", fn: happyPath },
  { name: "02-revert-paths", fn: revertPaths },
  { name: "03-nondet-validation", fn: nondetValidation }
];

const filter = process.argv.slice(2);
const suites = filter.length ? ALL.filter(s => filter.includes(s.name)) : ALL;

const main = async () => {
  console.log(`Contract: ${CONTRACT}`);
  console.log(`Network:  Studionet (chainId ${CHAIN_ID}), RPC ${ENDPOINT}`);
  console.log(`Suites:   ${suites.map(s => s.name).join(", ")}\n`);

  const results = [];
  for (const s of suites) {
    console.log(`\n===== ${s.name} =====`);
    const t0 = Date.now();
    try {
      const summary = await s.fn();
      results.push(summary);
      if (summary.fail > 0) {
        console.error(`\nSTOP: suite ${s.name} had ${summary.fail} failing assertion(s): ${summary.fails.join(", ")}`);
        printFinal(results);
        process.exit(1);
      }
    } catch (e) {
      console.error(`\nFATAL in suite ${s.name}: ${e}`);
      results.push({ name: s.name, pass: 0, fail: 1, ms: Date.now() - t0, fails: ["FATAL: " + String(e).slice(0, 200)] });
      printFinal(results);
      process.exit(1);
    }
  }
  printFinal(results);
  process.exit(0);
};

function printFinal(results) {
  console.log("\n===== FINAL SUMMARY =====");
  console.log(`Contract: ${CONTRACT}`);
  console.log(`Network:  Studionet (chainId ${CHAIN_ID}), RPC ${ENDPOINT}`);
  for (const r of results) {
    console.log(`  ${r.name}: ${r.pass} passed, ${r.fail} failed, ${(r.ms / 1000).toFixed(1)}s`);
  }
  const totalPass = results.reduce((a, r) => a + r.pass, 0);
  const totalFail = results.reduce((a, r) => a + r.fail, 0);
  const totalMs = results.reduce((a, r) => a + r.ms, 0);
  console.log(`  TOTAL: ${totalPass} passed, ${totalFail} failed, ${(totalMs / 1000).toFixed(1)}s`);
}

main();
