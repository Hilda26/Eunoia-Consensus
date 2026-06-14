"use client";

// Storage for in-flight GenLayer review submissions.
//
// Studionet consensus takes 60-120 s. When the user refreshes, the original
// in-page promise dies but the on-chain transaction keeps running. We
// persist the (hash, kind, startedAt) tuple so a polling hook can resume
// after refresh, read the verdict from the chain, and apply it.

const KEY = "eunoia.pending.v1";
const MAX_AGE_MS = 15 * 60 * 1000; // expire pending entries after 15 min

export type PendingKind = "wellness" | "goal" | "reply" | "consent" | "checkin";

export interface Pending {
  hash: string;
  startedAt: number;
  kind: PendingKind;
  // For per-item flows (a specific commitment / reply / consent), the local
  // id of the item the verdict should be attached to.
  targetId?: string;
  // Free-form payload snapshot the resolver can use to build events.
  meta?: Record<string, any>;
}

export function loadPending(): Pending[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Pending[];
    const cutoff = Date.now() - MAX_AGE_MS;
    return Array.isArray(list) ? list.filter(p => p?.hash && p.startedAt > cutoff) : [];
  } catch {
    return [];
  }
}

function save(list: Pending[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
  // Custom event so same-tab hooks pick it up (storage event only fires across tabs).
  window.dispatchEvent(new CustomEvent("eunoia:pending-changed"));
}

export function addPending(p: Pending) {
  const list = loadPending();
  if (list.some(x => x.hash === p.hash)) return;
  list.push(p);
  save(list);
}

export function removePending(hash: string) {
  save(loadPending().filter(p => p.hash !== hash));
}
