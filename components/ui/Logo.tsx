// Eunoia mark + wordmark.
//
// Mark: stylized lowercase "e" in cream on aubergine, with a small sage
// signal dot - "calm + consensus" in one glance. Matches /app/icon.svg
// which Next auto-uses as the favicon.
//
// Usage:
//   <Logo />                          mark + "Eunoia" wordmark
//   <Logo wordmark={false} />         mark only (compact)
//   <Logo size={48} />                custom mark size
//   <Logo className="text-3xl" />     adjust wordmark text size via className

import React from "react";
import { cn } from "@/lib/utils/cn";

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="14" fill="#3A1628" />
      <g stroke="#F2EDE3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 44 30 A 14 14 0 1 0 44 38" />
        <path d="M 18 32 L 42 32" />
      </g>
      <circle cx="49" cy="16" r="4.5" fill="#9DB8A2" />
    </svg>
  );
}

export function Logo({
  size = 28,
  wordmark = true,
  className
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {wordmark && <span className="font-head leading-none">Eunoia</span>}
    </span>
  );
}
