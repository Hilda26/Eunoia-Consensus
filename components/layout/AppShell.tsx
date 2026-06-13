"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Activity, Sparkles, Target, Users, Shield,
  ScrollText, Gauge, Settings as SettingsIcon
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UserMenu } from "@/components/auth/UserMenu";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/mood", label: "Mood Signals", icon: Activity },
  { href: "/checkin", label: "AI Check-in", icon: Sparkles },
  { href: "/commitments", label: "Commitments", icon: Target },
  { href: "/circles", label: "Support Circles", icon: Users },
  { href: "/vault", label: "Privacy Vault", icon: Shield },
  { href: "/research", label: "Research Consent", icon: ScrollText },
  { href: "/risk", label: "Risk Indicator", icon: Gauge },
  { href: "/settings", label: "Settings", icon: SettingsIcon }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-bg text-ink">
      <Topbar />
      <div className="flex">
        <aside className="hidden md:flex w-64 shrink-0 flex-col gap-1 border-r border-line p-5 sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto scrollthin">
          <Link href="/" className="font-head text-2xl mb-6 px-2">Eunoia</Link>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link key={href} href={href} className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition",
                active ? "bg-aubergine text-bg" : "hover:bg-panel text-ink"
              )}>
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
          <div className="mt-auto pt-6 text-xs text-muted px-2">
            Private and local-first.
          </div>
        </aside>
        <main className="flex-1 min-w-0 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bg/90 backdrop-blur px-6 py-3 text-xs">
      <span className="font-head text-sm">Eunoia</span>
      <span className="chip">Private session</span>
      <span className="chip">Raw notes stay on this device</span>
      <UserMenu />
    </div>
  );
}
