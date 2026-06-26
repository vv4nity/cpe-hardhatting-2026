"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { AuthGate } from "@/components/app/auth-gate";
import { AppShell } from "@/components/app/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = useApp((s) => s.user);
  const router = useRouter();

  // Scanner role has its own full-screen experience, not the standard shell.
  useEffect(() => {
    if (user?.role === "scanner") router.replace("/scanner");
  }, [user, router]);

  return (
    <AuthGate roles={["attendee", "president", "admin"]}>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
