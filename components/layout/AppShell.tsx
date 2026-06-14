"use client";
import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Activity, Sparkles, Target, Users, Shield,
  ScrollText, Gauge, Settings as SettingsIcon, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { UserMenu } from "@/components/auth/UserMenu";
import { Logo, LogoMark } from "@/components/ui/Logo";

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
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Tracks the pending route so the clicked tab can show feedback
  // immediately while Next loads the next page.
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function go(href: string) {
    if (href === pathname) { setDrawerOpen(false); return; }
    setPendingPath(href);
    setDrawerOpen(false);
    startTransition(() => {
      router.push(href);
    });
  }

  // Clear pending highlight when the route actually changes.
  React.useEffect(() => { setPendingPath(null); }, [pathname]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Topbar onMenu={() => setDrawerOpen(true)} />
      <div className="flex">
        {/* desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col gap-1 border-r border-line p-5 sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto scrollthin">
          <NavList pathname={pathname} pending={pendingPath} onClick={go} />
          <div className="mt-auto pt-6 text-xs text-muted px-2">
            Private and local-first.
          </div>
        </aside>

        {/* mobile drawer */}
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-ink/40 md:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            />
            <aside className="fixed left-0 top-0 z-50 h-full w-72 bg-bg border-r border-line p-5 flex flex-col gap-1 md:hidden">
              <div className="flex items-center justify-between mb-4">
                <Logo size={28} className="text-2xl px-2" />
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-full hover:bg-panel"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <NavList pathname={pathname} pending={pendingPath} onClick={go} />
              <div className="mt-auto pt-6 text-xs text-muted px-2">
                Private and local-first.
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 min-w-0 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}

function NavList({
  pathname, pending, onClick
}: { pathname: string | null; pending: string | null; onClick: (href: string) => void }) {
  return (
    <>
      <Link href="/" className="mb-6 px-2 hidden md:inline-flex">
        <Logo size={28} className="text-2xl" />
      </Link>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href);
        const isPending = pending === href;
        return (
          <button
            key={href}
            type="button"
            onClick={() => onClick(href)}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors text-left",
              "active:scale-[0.98]",
              active || isPending ? "bg-aubergine text-bg" : "hover:bg-panel text-ink"
            )}
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {isPending && !active && (
              <span className="inline-block h-2 w-2 rounded-full bg-bg animate-pulse" />
            )}
          </button>
        );
      })}
    </>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-bg/90 backdrop-blur px-4 sm:px-6 py-3 text-xs">
      <button
        onClick={onMenu}
        className="md:hidden p-1.5 rounded-full hover:bg-panel"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>
      <Logo size={20} className="text-sm" />
      <span className="chip hidden sm:inline-flex">Private session</span>
      <span className="chip hidden sm:inline-flex">Raw notes stay on this device</span>
      <UserMenu />
    </div>
  );
}
