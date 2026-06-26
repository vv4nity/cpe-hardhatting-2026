"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { homeFor } from "@/lib/nav";
import type { Role } from "@/lib/types";
import { Logo } from "@/components/brand/logo";

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Logo className="size-14 animate-pulse" />
        <p className="text-sm font-medium text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

/**
 * Client route guard. Waits for session rehydration, then redirects
 * unauthenticated users to /login and out-of-role users to their home.
 */
export function AuthGate({
  roles,
  children,
}: {
  roles?: Role[];
  children: React.ReactNode;
}) {
  const hydrated = useHydrated();
  const user = useApp((s) => s.user);
  const router = useRouter();

  const allowed = !roles || (user ? roles.includes(user.role) : false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
    } else if (!allowed) {
      router.replace(homeFor(user.role));
    }
  }, [hydrated, user, allowed, router]);

  if (!hydrated || !user || !allowed) return <Splash />;
  return <>{children}</>;
}
