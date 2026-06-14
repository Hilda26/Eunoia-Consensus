"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ModuleHeader, Card, SectionLabel, Badge, Button } from "@/components/ui/Primitives";
import { shortHash } from "@/lib/utils/explorer";
import { fmtAgo } from "@/lib/utils/dates";
import { ArrowLeft, Copy, Check } from "lucide-react";

type TxResponse = {
  ok: boolean;
  hash: string;
  status: string;
  executionResult: string | null;
  from: string | null;
  to: string | null;
  contract: string | null;
  method: string | null;
  verdict: any;
  leaderError: string | null;
  leaderStderr: string | null;
  validatorCount: number;
  validatorVotes: string[];
};

export default function TxPage() {
  const params = useParams();
  const hash = String(params?.hash || "");
  const [data, setData] = useState<TxResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hash) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/tx/${hash}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return;
        if (!j?.ok) setError(j?.error || "Could not load transaction");
        else setData(j);
      })
      .catch(e => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hash]);

  function copyHash() {
    if (!hash) return;
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const okResult = data?.executionResult && /SUCCESS|ACCEPTED/i.test(data.executionResult);

  return (
    <div>
      <Link href="/overview" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-4">
        <ArrowLeft size={14} /> back to overview
      </Link>
      <ModuleHeader
        section="tx / studionet"
        title="Transaction details"
        subtitle="Read live from GenLayer Studionet via the EunoiaConsensus contract receipt."
      />

      <Card className="mb-6">
        <SectionLabel number="01 /" label="Transaction hash" />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <code className="text-xs sm:text-sm bg-bg/60 thin-border rounded-xl px-3 py-2 break-all">{hash}</code>
          <Button variant="secondary" onClick={copyHash} className="text-xs">
            {copied ? <><Check size={14} /> copied</> : <><Copy size={14} /> copy</>}
          </Button>
        </div>
      </Card>

      {loading && (
        <Card><p className="text-sm text-muted">Reading the receipt from Studionet...</p></Card>
      )}

      {error && (
        <Card className="border-danger/40">
          <Badge tone="danger">unavailable</Badge>
          <p className="text-sm mt-3">{error}</p>
          <p className="text-xs text-muted mt-2">If this transaction was just submitted, give it 60-120 s for consensus to finish, then refresh.</p>
        </Card>
      )}

      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionLabel number="02 /" label="Status" />
            <div className="mt-3 grid gap-2 text-sm">
              <Row k="Chain status" v={<Badge tone={okResult ? "ok" : "warn"}>{data.status || "unknown"}</Badge>} />
              <Row k="Execution" v={<Badge tone={okResult ? "ok" : "danger"}>{data.executionResult || "n/a"}</Badge>} />
              <Row k="Method" v={<span className="font-mono text-xs">{data.method || "—"}</span>} />
              <Row k="Validators" v={`${data.validatorCount}`} />
            </div>
          </Card>

          <Card>
            <SectionLabel number="03 /" label="Parties" />
            <div className="mt-3 grid gap-2 text-sm">
              <Row k="Signer" v={<span className="font-mono text-xs break-all">{data.from || "—"}</span>} />
              <Row k="Contract" v={<span className="font-mono text-xs break-all">{data.to || data.contract || "—"}</span>} />
            </div>
          </Card>

          {data.validatorVotes.length > 0 && (
            <Card className="lg:col-span-2">
              <SectionLabel number="04 /" label="Validator votes" />
              <div className="mt-3 flex flex-wrap gap-2">
                {data.validatorVotes.map((v, i) => (
                  <Badge key={i} tone={/SUCCESS|ACCEPTED|agree/i.test(v) ? "ok" : "warn"}>
                    #{i + 1} {v}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          <Card className="lg:col-span-2">
            <SectionLabel number="05 /" label="Consensus verdict" />
            {data.verdict ? (
              <pre className="mt-3 text-xs overflow-auto thin-border rounded-xl p-3 bg-bg/60 whitespace-pre-wrap">
                {JSON.stringify(data.verdict, null, 2)}
              </pre>
            ) : data.leaderError ? (
              <p className="text-sm text-danger mt-3">Leader error: {data.leaderError}</p>
            ) : (
              <p className="text-sm text-muted mt-3">No verdict payload was attached to this transaction.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
