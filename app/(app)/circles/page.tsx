"use client";
import { useState, useCallback } from "react";
import { ModuleHeader, Card, Button, SectionLabel, Badge, Field } from "@/components/ui/Primitives";
import { useStore } from "@/hooks/useStore";
import { useReviewer } from "@/hooks/useReviewer";
import { shortId, userHashFromAlias } from "@/lib/utils/format";
import { submitReply, resolveReply } from "@/lib/eunoia/agentCoordinator";
import type { SupportReply, ReplyReview } from "@/types";
import { addPending, type Pending } from "@/lib/eunoia/pendingReviews";
import { usePendingReviews } from "@/hooks/usePendingReviews";
import { PendingPulse } from "@/components/ui/PendingPulse";

const CIRCLES = [
  { id: "student-burnout", name: "Student Burnout" },
  { id: "founder-stress", name: "Founder Stress" },
  { id: "healthcare-recovery", name: "Healthcare Recovery" },
  { id: "meditation-beginners", name: "Meditation Beginners" },
  { id: "sleep-reset", name: "Sleep Reset" },
  { id: "therapy-consistency", name: "Therapy Consistency" }
];

export default function CirclesPage() {
  const { state, setState } = useStore();
  const { reviewer } = useReviewer();
  const [circle, setCircle] = useState(CIRCLES[0].id);
  const [text, setText] = useState("");

  const onResolved = useCallback((p: Pending, review: ReplyReview) => {
    setState(s => ({
      ...s,
      replies: s.replies.map(r => r.id === p.targetId ? { ...r, review } : r),
      events: resolveReply(p.hash, review, s.events)
    }));
  }, [setState]);
  const pending = usePendingReviews("reply", onResolved);
  const pendingByReply: Record<string, Pending> = {};
  for (const p of pending) if (p.targetId) pendingByReply[p.targetId] = p;

  // Reply posts locally + queues the review. Refreshing or closing the
  // tab keeps the review running and resumes when the verdict lands.
  function submit() {
    if (!text.trim() || !reviewer) return;
    const replyText = text;
    const reply: SupportReply = { id: shortId("reply"), ts: Date.now(), circle, alias: state.alias, text: replyText };
    setState(s => ({ ...s, replies: [reply, ...s.replies] }));
    setText("");
    (async () => {
      try {
        const { hash, events } = await submitReply(reviewer, {
          userHash: userHashFromAlias(state.alias),
          circleAlias: state.alias,
          replyText,
          events: state.events
        });
        setState(s => ({ ...s, events }));
        addPending({ hash, startedAt: Date.now(), kind: "reply", targetId: reply.id });
      } catch {
        // soft fail - reply stays in pending state visually
      }
    })();
  }

  return (
    <div>
      <ModuleHeader section="05 / support circles" title="Anonymous by default" subtitle="Replies are reviewed by GenLayer for safety before they become visible. Medical advice and unsafe replies are blocked." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CIRCLES.map(c => (
          <Card key={c.id} className={`${circle === c.id ? "ring-2 ring-aubergine" : ""}`}>
            <h3 className="font-head text-lg">{c.name}</h3>
            <p className="text-xs text-muted mt-1">Anonymous template circle</p>
            <Button variant="secondary" className="mt-4" onClick={() => setCircle(c.id)}>{circle === c.id ? "Selected" : "Select"}</Button>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <SectionLabel number="07 /" label={`Reply as ${state.alias}`} />
        <div className="mt-3 grid gap-3">
          <Field label="Reply text"><textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Be supportive. No medical advice." /></Field>
          <div><Button onClick={submit}>Send for GenLayer review</Button></div>
        </div>
      </Card>

      <Card className="mt-6">
        <SectionLabel number="08 /" label="Recent reviewed replies" />
        <div className="mt-4 grid gap-3">
          {state.replies.map(r => (
            <div key={r.id} className="thin-border rounded-2xl p-4 bg-bg/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm"><strong>{r.alias}</strong> in {CIRCLES.find(c => c.id === r.circle)?.name || r.circle}</span>
                {r.review ? (
                  <div className="flex gap-2">
                    <Badge tone={r.review.visible ? "ok" : "warn"}>{r.review.classification}</Badge>
                    {r.review.qualityBadge && <Badge tone="accent">support quality</Badge>}
                  </div>
                ) : pendingByReply[r.id] ? (
                  <PendingPulse label="review pending" since={pendingByReply[r.id].startedAt} />
                ) : null}
              </div>
              {!r.review ? (
                <p className="text-sm mt-2">{r.text}</p>
              ) : r.review.visible ? (
                <p className="text-sm mt-2">{r.text}</p>
              ) : (
                <p className="text-sm mt-2 text-muted italic">Reply hidden by GenLayer review: {r.review.reasoning}</p>
              )}
            </div>
          ))}
          {!state.replies.length && <p className="text-sm text-muted">No replies yet.</p>}
        </div>
      </Card>
    </div>
  );
}
