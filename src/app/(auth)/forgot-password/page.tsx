"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { AuthSplit } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/public/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const b = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
      } else if (b.error === "rate_limited") {
        setError("Too many attempts. Please wait a couple of minutes and try again.");
      } else {
        setError("Please enter a valid email.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthSplit>
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-amber/15 text-brand-orange">
          <MailCheck className="size-7" />
        </div>
        <h1 className="mt-4 font-display text-3xl leading-tight tracking-wide">
          CHECK YOUR EMAIL
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-semibold text-foreground">{email}</span>, we&apos;ve
          sent a link to reset your password. Check your inbox (and spam).
        </p>
        <Button asChild variant="outline" size="lg" className="mt-5 w-full">
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit>
      <h1 className="font-display text-3xl leading-tight tracking-wide sm:text-4xl">
        FORGOT PASSWORD
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the email you registered with and we&apos;ll send you a link to set
        a new password.
      </p>

      <form className="mt-6 space-y-3" onSubmit={submit}>
        <div className="space-y-1.5">
          <Label htmlFor="em" className="text-sm">Email</Label>
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
        {error && <p className="text-sm font-medium text-brand-red">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Send reset link
          <ArrowRight />
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Remembered it?{" "}
        <Link href="/signin" className="font-semibold text-foreground underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthSplit>
  );
}
