"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { homeFor } from "@/lib/nav";
import type { Role } from "@/lib/types";
import { BrandLoader } from "@/components/brand/brand-loader";

/**
 * Client route guard. Waits for session rehydration, then redirects
 * unauthenticated users to the homepage and out-of-role users to their home.
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
      router.replace("/");
    } else if (!allowed) {
      router.replace(homeFor(user.role));
    }
  }, [hydrated, user, allowed, router]);

  if (!hydrated || !user || !allowed) return <BrandLoader />;
  return <>{children}</>;
}
