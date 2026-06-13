// Step 0: sanity check - RPC reachable, wallet balance, contract readable.
import { makeClient, CONTRACT, ENDPOINT, readJson, Reporter } from "./_lib.mjs";

export async function run() {
  const r = new Reporter("00-sanity");
  const { client, account } = makeClient();

  console.log(`  wallet: ${account.address}`);
  console.log(`  rpc:    ${ENDPOINT}`);
  console.log(`  chain:  ${client.chain?.id}`);
  console.log(`  contract: ${CONTRACT}`);

  let balance = null;
  try {
    balance = await client.getBalance({ address: account.address });
    console.log(`  balance: ${balance} wei`);
  } catch (e) {
    r.ok("getBalance reachable", false, String(e).slice(0, 200));
  }
  r.ok("getBalance call succeeds (RPC reachable)", balance !== null);

  if (balance === 0n) {
    console.log("  NOTE: wallet balance is 0. Studionet does not meter gas for");
    console.log("  @gl.public.write calls (fundAccount is localnet-only and the");
    console.log("  prior live-contract test ran 5/5 writes from a freshly");
    console.log("  generated, zero-balance account). Proceeding, but flagging");
    console.log("  this per the brief rather than hard-aborting.");
  }

  let stats = null;
  try {
    stats = await readJson(client, "get_protocol_stats", []);
    console.log(`  get_protocol_stats -> ${JSON.stringify(stats)}`);
  } catch (e) {
    r.ok("contract read (get_protocol_stats)", false, String(e).slice(0, 200));
  }
  r.ok("contract read (get_protocol_stats) returns data", stats != null && typeof stats === "object");
  r.ok("get_protocol_stats has totalReviews", stats && typeof stats.totalReviews === "number");
  r.ok("get_protocol_stats has byType breakdown", stats && typeof stats.byType === "object");

  const summary = r.summary();
  if (summary.fail > 0) {
    console.error("\nFATAL: Step 0 sanity check failed - aborting suite run.");
    process.exit(2);
  }
  return summary;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("00-sanity.mjs")) {
  run().then(s => process.exit(s.fail > 0 ? 1 : 0)).catch(e => { console.error("FATAL:", e); process.exit(2); });
}
