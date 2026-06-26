"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { homeFor } from "@/lib/nav";
import { Logo } from "@/components/brand/logo";

export default function RootPage() {
  const hydrated = useHydrated();
  const user = useApp((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(user ? homeFor(user.role) : "/login");
  }, [hydrated, user, router]);

  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <Logo className="size-14 animate-pulse" />
    </div>
  );
}
