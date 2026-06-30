"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { SECTIONS } from "@/lib/sections";
import { AuthSplit } from "@/components/auth/auth-split";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MSG: Record<string, string> = {
  not_found:
    "We couldn't find that name in the selected block. Use the exact name on your class directory, or contact an organizer.",
  already_registered:
    "You're already registered. Try signing in — or use “Forgot password” if you can't get in.",
  rate_limited: "Too many attempts. Please wait a couple of minutes and try again.",
  invalid: "Please fill in every field with a valid email.",
};

export default function NoInvitePage() {
  const [surname, setSurname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [mi, setMi] = useState("");
  const [block, setBlock] = useState("");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!surname.trim() || !firstName.trim() || !block || !email.trim()) return;
    if (email.trim().toLowerCase() !== confirm.trim().toLowerCase()) {
      setError("The two emails don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/email-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surname: surname.trim(),
          first_name: firstName.trim(),
          block,
          email: email.trim(),
        }),
      });
      const b = await res.json().catch(() => ({}));
      if (b.status === "queued") {
        setDone(true);
        return;
      }
      setError(MSG[b.status ?? b.error ?? ""] ?? "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthSplit>
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-green/12 text-brand-green">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="mt-4 font-display text-3xl leading-tight tracking-wide">
          REQUEST SENT
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks! We&apos;ve sent your corrected email to the organizers for
          review. Once they approve it, a fresh invitation will be emailed to{" "}
          <span className="font-semibold text-foreground">{email}</span>.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-5 w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit>
      <h1 className="font-display text-3xl leading-tight tracking-wide sm:text-4xl">
        DIDN&apos;T GET YOUR INVITE?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        If your invitation never arrived (e.g. a typo in your email), confirm
        your details and the correct email. We&apos;ll review and re-send it.
      </p>

      <form className="mt-6 space-y-3" onSubmit={submit}>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2.5">
          <div className="space-y-1.5">
            <Label htmlFor="sn" className="text-sm">Surname</Label>
            <Input id="sn" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Dela Cruz" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fn" className="text-sm">First name</Label>
            <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Juan" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mi" className="text-sm">M.I.</Label>
            <Input id="mi" value={mi} onChange={(e) => setMi(e.target.value)} placeholder="A." className="w-16" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Block / Section</Label>
          <Select value={block} onValueChange={setBlock}>
            <SelectTrigger>
              <SelectValue placeholder="Select your section" />
            </SelectTrigger>
            <SelectContent>
              {SECTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="em" className="text-sm">Correct email</Label>
          <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="em2" className="text-sm">Confirm email</Label>
          <Input id="em2" type="email" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your email" />
        </div>

        {error && <p className="text-sm font-medium text-brand-red">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Submit request
          <ArrowRight />
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Already registered?{" "}
        <Link href="/signin" className="font-semibold text-foreground underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthSplit>
  );
}
