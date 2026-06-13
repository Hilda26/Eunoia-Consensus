// Shared helpers for the EunoiaConsensus E2E suite on GenLayer Studionet.
import fs from "fs";
import path from "path";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT = "0xa7e6F5cD2c48fd46dd4449C4D09a3501b8bc7f40";
export const ENDPOINT = "https://studio.genlayer.com/api";
export const CHAIN_ID = 61999;

// Load .env.test (gitignored) without pulling in a dotenv dependency.
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvFile(path.resolve(process.cwd(), ".env.test"));

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`FATAL: missing required env var ${name}. Stopping (no fallback).`);
    process.exit(2);
  }
  return v;
}

export function makeClient() {
  const pk = requireEnv("GENLAYER_TEST_PRIVATE_KEY");
  const account = createAccount(pk);
  const client = createClient({ chain: studionet, endpoint: ENDPOINT, account });
  return { client, account };
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Unwrap the genlayer-js v1 calldata envelope into a JS value.
export function parseLeaderResult(lr) {
  if (!lr) return { _missing_leader_receipt: true };
  let raw = lr.result;
  if (raw && typeof raw === "object" && "payload" in raw) {
    const p = raw.payload;
    raw = (p && typeof p === "object") ? (p.readable ?? p.raw ?? p) : p;
  }
  let v = raw;
  for (let i = 0; i < 3 && typeof v === "string"; i++) {
    const s = v.trim();
    try { v = JSON.parse(s); continue; } catch { /* not json yet */ }
    if (s.startsWith("0x")) {
      try {
        const h = s.slice(2);
        const bytes = new Uint8Array(h.length / 2);
        for (let i2 = 0; i2 < bytes.length; i2++) bytes[i2] = parseInt(h.slice(i2 * 2, i2 * 2 + 2), 16);
        const text = new TextDecoder().decode(bytes);
        const idx = text.indexOf("{");
        const idxArr = text.indexOf("[");
        const start = idx >= 0 && (idxArr < 0 || idx < idxArr) ? idx : idxArr;
        v = start >= 0 ? text.slice(start) : text;
        continue;
      } catch { /* fall through */ }
    }
    break;
  }
  return v;
}

function leaderFrom(txOrReceipt) {
  const leaders = txOrReceipt?.consensus_data?.leader_receipt;
  return Array.isArray(leaders) ? leaders[0] : leaders;
}

// Write a contract method with retries, then assert on-chain consensus status
// (not just "the promise resolved"). Returns { hash, lr, parsed, ms, executionResult }.
export async function writeWithRetry(client, functionName, payload, opts = {}) {
  const attempts = opts.attempts ?? 3;
  const expectFailure = opts.expectFailure ?? false;
  const argSummary = JSON.stringify(payload);
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    console.log(`  -> ${functionName}(${argSummary.slice(0, 140)}${argSummary.length > 140 ? "..." : ""}) [attempt ${i}/${attempts}]`);
    const t0 = Date.now();
    try {
      const hash = await client.writeContract({
        address: CONTRACT,
        functionName,
        args: [JSON.stringify(payload)],
        value: 0n
      });
      const receipt = await client.waitForTransactionReceipt({ hash, retries: 200, interval: 3000 });
      const tx = await client.getTransaction({ hash });
      const lr = leaderFrom(tx) || leaderFrom(receipt);
      const executionResult = String(lr?.execution_result || "").toUpperCase();
      const ms = Date.now() - t0;

      if (!executionResult.includes("SUCCESS") && !executionResult.includes("ACCEPTED")) {
        const stderr = lr?.stderr || lr?.error || "";
        const lastLines = String(stderr).split("\n").filter(Boolean).slice(-2).join(" | ");
        if (expectFailure) {
          console.log(`  REVERTED as expected (${ms}ms) tx=${hash} result=${executionResult || "n/a"} stderr=${lastLines || "(none)"}`);
          return { hash, lr, parsed: null, ms, executionResult, reverted: true, stderr: lastLines };
        }
        throw new Error(`execution_result=${executionResult || "n/a"} stderr: ${lastLines}`);
      }

      const parsed = parseLeaderResult(lr);
      if (expectFailure) {
        console.log(`  did NOT revert (${ms}ms) tx=${hash} result=${executionResult}`);
        return { hash, lr, parsed, ms, executionResult, reverted: false };
      }
      console.log(`  OK ${functionName} (${ms}ms) tx=${hash} result=${executionResult}`);
      return { hash, lr, parsed, ms, executionResult, reverted: false };
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || e).slice(0, 220);
      if (expectFailure) {
        // A thrown promise during waitForTransactionReceipt/getTransaction is
        // not itself proof of an on-chain revert - but if genlayer-js surfaces
        // the GenVM error text, treat it as a confirmed on-chain failure.
        if (/VmUserError|UserError|Traceback|Error\(/i.test(msg)) {
          console.log(`  REVERTED as expected via thrown GenVM error (${Date.now() - t0}ms): ${msg}`);
          return { hash: null, lr: null, parsed: null, ms: Date.now() - t0, executionResult: "ERROR", reverted: true, stderr: msg };
        }
      }
      console.log(`  error on attempt ${i}: ${msg}`);
      if (i < attempts) await sleep(5000);
    }
  }
  throw lastErr;
}

export async function readJson(client, functionName, args = []) {
  const raw = await client.readContract({ address: CONTRACT, functionName, args });
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return parseLeaderResult({ result: raw }) ?? raw;
}

export class Reporter {
  constructor(name) {
    this.name = name;
    this.pass = 0;
    this.fail = 0;
    this.fails = [];
    this.t0 = Date.now();
  }
  ok(label, cond, extra = "") {
    if (cond) { this.pass++; console.log(`  PASS  ${label}`); }
    else { this.fail++; this.fails.push(label); console.log(`  FAIL  ${label}  ${extra}`); }
  }
  summary() {
    const ms = Date.now() - this.t0;
    console.log(`\n${this.name} SUMMARY: ${this.pass} passed, ${this.fail} failed (${ms}ms)`);
    if (this.fails.length) console.log(`  failures: ${this.fails.join(", ")}`);
    return { name: this.name, pass: this.pass, fail: this.fail, ms, fails: this.fails };
  }
}
