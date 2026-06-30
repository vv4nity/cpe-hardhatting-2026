"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, ScanLine } from "lucide-react";
import { useApp } from "@/lib/store";
import { navTabsFor } from "@/lib/nav";
import { roleLabel } from "@/lib/format";
import { signOutEverywhere } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/logo";
import { PartnerLogos } from "@/components/brand/partner-logos";
import { CheckinCelebration } from "@/components/app/checkin-celebration";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useApp((s) => s.user);
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;
  const tabs = navTabsFor(user.role);

  async function signOut() {
    await signOutEverywhere();
    router.replace("/");
  }

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <CheckinCelebration />
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={tabs[0]?.href ?? "/"} className="min-w-0 shrink">
            <Wordmark />
          </Link>

          {/* desktop nav */}
          <nav className="hidden items-center gap-1 rounded-2xl bg-secondary/60 p-1 lg:flex">
            {tabs.map((tab) => {
              const active =
                pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-brand-amber text-brand-ink shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <UserMenu
            name={user.name}
            initials={user.initials}
            role={roleLabel(user.role)}
            email={user.email}
            onSignOut={signOut}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border/70 px-4 py-7">
        <PartnerLogos />
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          CPE Hardhatting 2026 · In partnership with ACCESS · PUP CpE Department
          · ICPEP SE - PUP
        </p>
      </footer>

      {/* mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition-colors",
                  active ? "text-brand-ink" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand-amber" />
                )}
                <tab.icon
                  className={cn("size-5", active && "text-brand-orange")}
                />
                <span className="truncate">{tab.short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function UserMenu({
  name,
  initials,
  role,
  email,
  onSignOut,
}: {
  name: string;
  initials: string;
  role: string;
  email: string;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-2xl border border-border bg-card py-1.5 pl-1.5 pr-2.5 shadow-sm outline-none transition-colors hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="grid size-8 place-items-center rounded-xl bg-brand-ink text-xs font-bold text-brand-cream">
          {initials}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[10rem] truncate text-sm font-semibold">
            {name}
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {role}
          </span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[15rem]">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-secondary-foreground">
            <ScanLine className="size-3" />
            {role}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
