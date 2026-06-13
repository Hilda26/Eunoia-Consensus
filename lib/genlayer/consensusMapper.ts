import type { RiskLevel } from "@/types";

export function riskTone(level: RiskLevel): "ok" | "info" | "warn" | "danger" {
  switch (level) {
    case "STEADY": return "ok";
    case "WATCH": return "info";
    case "ELEVATED": return "warn";
    case "HIGH": return "danger";
  }
}

export function validatorTrace(seedHash: string, count = 5) {
  const verdicts = ["agree", "agree", "agree", "agree", "agree"];
  let seed = 0;
  for (let i = 0; i < seedHash.length; i++) seed = (seed * 31 + seedHash.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }).map((_, i) => {
    const r = (seed + i * 97) % 100;
    const conf = 0.7 + (r % 25) / 100;
    return {
      validator: `v_${(seed + i).toString(16).slice(-4)}`,
      vote: r < 90 ? verdicts[i % verdicts.length] : "abstain",
      confidence: Number(conf.toFixed(2)),
      latencyMs: 180 + (r % 220)
    };
  });
}
