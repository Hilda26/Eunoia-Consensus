"use client";
import React from "react";
import { cn } from "@/lib/utils/cn";

export function Button({
  variant = "primary", className, children, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "soft" | "danger" | "ghost" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-aubergine text-bg hover:bg-clay",
    secondary: "bg-transparent text-ink border border-line hover:bg-panel",
    soft: "bg-powder/70 text-ink hover:bg-powder",
    danger: "bg-clay/30 text-danger hover:bg-clay/50",
    ghost: "bg-transparent text-ink hover:bg-panel"
  }[variant];
  return <button className={cn(base, styles, className)} {...props}>{children}</button>;
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card p-6", className)} {...props}>{children}</div>;
}

export function Badge({ tone = "info", className, children }: { tone?: "info" | "ok" | "warn" | "danger" | "accent"; className?: string; children: React.ReactNode }) {
  const styles = {
    info: "bg-panel text-ink",
    ok: "bg-sage/30 text-success border-success/30",
    warn: "bg-clay/20 text-warning border-warning/30",
    danger: "bg-danger/15 text-danger border-danger/30",
    accent: "bg-powder/50 text-ink"
  }[tone];
  return <span className={cn("badge", styles, className)}>{children}</span>;
}

export function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="section-num">{number}</span>
      <h3 className="font-head text-xl">{label}</h3>
    </div>
  );
}

export function StatCard({ label, value, sub, tone = "info" }: { label: string; value: React.ReactNode; sub?: string; tone?: "info" | "ok" | "warn" | "danger" }) {
  const accent = { info: "text-ink", ok: "text-success", warn: "text-warning", danger: "text-danger" }[tone];
  return (
    <Card className="flex flex-col gap-2">
      <span className="section-num">{label}</span>
      <span className={cn("font-head text-3xl", accent)}>{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </Card>
  );
}

export function ModuleHeader({ section, title, subtitle, right }: { section: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6 mb-8">
      <div>
        <span className="section-num">{section}</span>
        <h1 className="font-head text-4xl mt-1">{title}</h1>
        {subtitle && <p className="text-muted mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
