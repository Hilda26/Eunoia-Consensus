import type { DataCategory, PermissionLevel } from "@/types";

export function isAllowedForReview(level: PermissionLevel): boolean {
  return level === "GENLAYER_REVIEW_ONLY" || level === "ANONYMISED_RESEARCH" || level === "SUPPORT_CIRCLE_ALIAS";
}

export function isAllowedForResearch(level: PermissionLevel): boolean {
  return level === "ANONYMISED_RESEARCH";
}

export function describeLevel(level: PermissionLevel): string {
  switch (level) {
    case "PRIVATE": return "Never sent off-device.";
    case "GENLAYER_REVIEW_ONLY": return "Reduced summary may be sent to GenLayer for review.";
    case "SUPPORT_CIRCLE_ALIAS": return "Visible inside anonymous support circles only.";
    case "ANONYMISED_RESEARCH": return "May be included in consent-reviewed anonymised research bundles.";
    case "DISABLED": return "Category inactive and unavailable.";
  }
}

export function withheldList(permissions: Record<DataCategory, PermissionLevel>): string[] {
  const base = ["raw journal text", "name", "email", "exact location", "therapy notes", "medical records"];
  if (permissions.JOURNAL_NOTES !== "GENLAYER_REVIEW_ONLY") base.push("journal sentiment summary");
  if (permissions.SLEEP_DATA === "PRIVATE" || permissions.SLEEP_DATA === "DISABLED") base.push("sleep trend");
  if (permissions.ENERGY_LOGS === "PRIVATE" || permissions.ENERGY_LOGS === "DISABLED") base.push("energy trend");
  if (permissions.MOOD_LOGS === "PRIVATE" || permissions.MOOD_LOGS === "DISABLED") base.push("mood trend");
  return base;
}
