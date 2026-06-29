"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { homeFor } from "@/lib/nav";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: sErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (sErr) {
        setError(
          /confirm/i.test(sErr.message)
            ? "Please verify your email first (check your inbox)."
            : "Incorrect email or password.",
        );
        return;
      }
      // wait for the session sync to load the profile + role, then route home
      await new Promise<void>((resolve) => {
        if (useApp.getState().user) return resolve();
        const unsub = useApp.subscribe((s) => {
          if (s.user) {
            unsub();
            resolve();
          }
        });
        setTimeout(() => {
          unsub();
          resolve();
        }, 5000);
      });
      const u = useApp.getState().user;
      router.replace(u ? homeFor(u.role) : "/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="SIGN IN"
      subtitle="Welcome back — sign in to view your seat and pass."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Invited but haven&apos;t set up your account? Open the activation link
          in your email.
        </p>
      }
    >
      {isSupabaseConfigured ? (
        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="em" className="text-sm">
              Email
            </Label>
            <Input
              id="em"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@iskolarngbayan.pup.edu.ph"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw" className="text-sm">
              Password
            </Label>
            <Input
              id="pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 text-base"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-brand-red">{error}</p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Sign in
            <ArrowRight />
          </Button>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          Student sign-in isn&apos;t live yet — it activates once the event
          backend is connected.
        </div>
      )}

      {isSupabaseConfigured && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Admin & scanner staff: sign in above with your provided credentials.
        </p>
      )}
    </AuthShell>
  );
}
