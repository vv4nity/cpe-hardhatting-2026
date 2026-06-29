"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import { homeFor } from "@/lib/nav";
import { AuthSplit } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
    <AuthSplit>
      <h1 className="font-display text-4xl leading-none tracking-wide sm:text-5xl">
        HARD HATS ON
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to view your seat and digital pass.
      </p>

      {isSupabaseConfigured ? (
            <form className="mt-6 space-y-3" onSubmit={submit}>
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
                  placeholder="you@email.com"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw" className="text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="pw"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 pr-11 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPw ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-sm font-medium text-brand-red">{error}</p>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Sign in
                <ArrowRight />
              </Button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              Student sign-in isn&apos;t live yet — it activates once the event
              backend is connected.
            </div>
          )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Invited but haven&apos;t set up your account? Open the activation link in
        your email.
      </p>
    </AuthSplit>
  );
}
