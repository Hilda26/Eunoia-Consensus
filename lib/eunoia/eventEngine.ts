import type { EunoiaEvent, EunoiaEventType } from "@/types";
import { shortId } from "@/lib/utils/format";

export function makeEvent(
  type: EunoiaEventType,
  label: string,
  opts?: { detail?: string; tone?: EunoiaEvent["tone"] }
): EunoiaEvent {
  return {
    id: shortId("evt"),
    ts: Date.now(),
    type,
    label,
    detail: opts?.detail,
    tone: opts?.tone || "info"
  };
}

export function pushEvent(events: EunoiaEvent[], e: EunoiaEvent, limit = 200): EunoiaEvent[] {
  return [e, ...events].slice(0, limit);
}
