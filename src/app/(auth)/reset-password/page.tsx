"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthSplit } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Phase = "checking" | "form" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // the recovery link must have established a session via /auth/confirm
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setPhase(data.user ? "form" : "invalid");
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: pErr } = await supabase.auth.updateUser({ password });
      if (pErr) {
        setError("Couldn't update your password. Please request a new link.");
        return;
      }
      setPhase("done");
      setTimeout(() => router.replace("/dashboard"), 1400);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "checking") {
    return (
      <AuthSplit>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking your link…
        </div>
      </AuthSplit>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthSplit>
        <h1 className="font-display text-3xl leading-tight tracking-wide">
          LINK EXPIRED
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This reset link is invalid or has expired. Request a new one and open
          the newest email.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-5 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthSplit>
    );
  }

  if (phase === "done") {
    return (
      <AuthSplit>
        <h1 className="font-display text-3xl leading-tight tracking-wide">
          PASSWORD UPDATED
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Your password has been changed. Taking you to your dashboard…
        </p>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit>
      <h1 className="font-display text-3xl leading-tight tracking-wide sm:text-4xl">
        SET A NEW PASSWORD
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a new password for your account.
      </p>

      <form className="mt-6 space-y-3" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label htmlFor="pw" className="text-sm">New password</Label>
          <div className="relative">
            <Input
              id="pw"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-12 pr-11 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw2" className="text-sm">Confirm password</Label>
          <Input
            id="pw2"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            className="h-12 text-base"
          />
        </div>
        {error && <p className="text-sm font-medium text-brand-red">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Update password
          <ArrowRight />
        </Button>
      </form>
    </AuthSplit>
  );
}
