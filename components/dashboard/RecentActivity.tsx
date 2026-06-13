"use client";
import React from "react";
import { useStore } from "@/hooks/useStore";
import { fmtAgo } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EunoiaEvent, EunoiaEventType } from "@/types";
import {
  Sparkles, Shield, Leaf, MessageCircle, Target, HeartHandshake, FileCheck, AlertCircle,
  type LucideIcon
} from "lucide-react";

const COPY: Record<EunoiaEventType, { label: (e: EunoiaEvent) => string; icon: LucideIcon }> = {
  MOOD_SIGNAL_CREATED:        { label: () => "You logged a wellness signal", icon: Leaf },
  PRIVACY_VAULT:              { label: e => e.label.replace(/^raw\s/, "Raw ") || "Privacy check completed", icon: Shield },
  PRIVACY_PERMISSION_UPDATED: { label: () => "Privacy permission updated", icon: Shield },
  SIGNAL_BUNDLE_CREATED:      { label: () => "Wellness summary prepared", icon: Sparkles },
  GENLAYER_REVIEW_REQUESTED:  { label: () => "Sent for AI consensus review", icon: Sparkles },
  GENLAYER_REVIEW_COMPLETED:  { label: e => `Review complete (${e.label.replace("risk level: ", "")})`, icon: Sparkles },
  CHECKIN_TRIGGERED:          { label: () => "A bounded check-in is ready", icon: HeartHandshake },
  COMMITMENT_CREATED:         { label: () => "New commitment created", icon: Target },
  GOAL_EVIDENCE_SUBMITTED:    { label: () => "You shared evidence for a commitment", icon: Target },
  GOAL_REVIEW_COMPLETED:      { label: e => `Goal reviewed (${e.label.replace("outcome: ", "").toLowerCase()})`, icon: Target },
  SUPPORT_REPLY_REVIEWED:     { label: () => "A support reply was reviewed", icon: MessageCircle },
  CONSENT_REVIEW_COMPLETED:   { label: () => "Consent request reviewed", icon: FileCheck },
  CRISIS_LANGUAGE_DETECTED:   { label: () => "Safety response was shown", icon: AlertCircle },
  SAFETY:                     { label: () => "Safety boundary applied", icon: Shield }
};

const HIDE_TYPES: EunoiaEventType[] = ["SIGNAL_BUNDLE_CREATED", "GENLAYER_REVIEW_REQUESTED", "SAFETY"];

export function RecentActivity({ limit = 8, className }: { limit?: number; className?: string }) {
  const { state } = useStore();
  const events = state.events.filter(e => !HIDE_TYPES.includes(e.type)).slice(0, limit);

  if (!events.length) {
    return (
      <div className={cn("thin-border rounded-card p-6 bg-bg/40 text-sm text-muted", className)}>
        Nothing here yet. Your activity will appear as you log signals and create commitments.
      </div>
    );
  }

  return (
    <ul className={cn("grid gap-2", className)}>
      {events.map(e => {
        const meta = COPY[e.type] ?? { label: () => e.label, icon: Sparkles };
        const Icon = meta.icon;
        const tone = e.tone === "danger" ? "text-danger" : e.tone === "warn" ? "text-warning" : e.tone === "ok" ? "text-success" : "text-ink";
        return (
          <li key={e.id} className="flex items-center gap-3 thin-border rounded-2xl px-4 py-3 bg-bg/50">
            <span className={cn("shrink-0 grid place-items-center w-8 h-8 rounded-full bg-panel", tone)}>
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{meta.label(e)}</p>
            </div>
            <span className="text-xs text-muted shrink-0">{fmtAgo(e.ts)}</span>
          </li>
        );
      })}
    </ul>
  );
}
