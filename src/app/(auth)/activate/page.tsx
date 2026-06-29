"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SECTIONS } from "@/lib/sections";
import { homeFor } from "@/lib/nav";
import type { Role } from "@/lib/types";
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

type Phase = "checking" | "invalid" | "form" | "done" | "closed";

const STATUS_MSG: Record<string, string> = {
  not_found:
    "We couldn't match that name in the selected block. Use the exact name on your class directory, or ask your block president.",
  email_mismatch:
    "That name doesn't match the email this invitation was sent to. Double-check your name and block, or contact an organizer.",
  already_claimed: "This seat has already been activated. Try signing in instead.",
};

export default function ActivatePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [invitedEmail, setInvitedEmail] = useState("");

  const [surname, setSurname] = useState("");
  const [firstName, setFirstName] = useState("");
  const [block, setBlock] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // the invite link must have established a session via /auth/confirm
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      // activation can be paused by organizers
      const { data: open } = await supabase.rpc("activation_open");
      if (open === false) {
        setPhase("closed");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setInvitedEmail(data.user.email ?? "");
        setPhase("form");
      } else {
        setPhase("invalid");
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!surname.trim() || !firstName.trim() || !block) return;
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
      const { data, error: rErr } = await supabase.rpc("activate_account", {
        p_surname: surname.trim(),
        p_first_name: firstName.trim(),
        p_block: block,
      });
      if (rErr) throw rErr;
      const status = (data as { status?: string })?.status;
      if (status === "closed") {
        setPhase("closed");
        return;
      }
      if (status !== "ok") {
        setError(STATUS_MSG[status ?? ""] ?? "We couldn't verify your record.");
        return;
      }

      const { error: pErr } = await supabase.auth.updateUser({ password });
      if (pErr) {
        setError("Your seat is linked, but the password couldn't be saved. Please try again.");
        return;
      }

      setPhase("done");
      const role = ((data as { role?: string })?.role as Role) ?? "attendee";
      setTimeout(() => router.replace(homeFor(role)), 1400);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "checking") {
    return (
      <AuthSplit>
        <Heading>ACTIVATE</Heading>
        <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking your invitation…
        </div>
      </AuthSplit>
    );
  }

  if (phase === "closed") {
    return (
      <AuthSplit>
        <Heading>ACTIVATION PAUSED</Heading>
        <p className="mt-6 text-sm text-muted-foreground">
          Account activation is temporarily closed while we make some
          improvements. You&apos;ll receive a fresh invitation email once it
          reopens — no action needed for now. Thanks for your patience!
        </p>
        <Button asChild variant="outline" size="lg" className="mt-5 w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </AuthSplit>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthSplit>
        <Heading>LINK EXPIRED</Heading>
        <p className="mt-6 text-sm text-muted-foreground">
          This activation link is invalid or has expired. Ask an organizer to
          re-send your invitation, then open the newest email.
        </p>
        <Button asChild variant="outline" size="lg" className="mt-5 w-full">
          <Link href="/signin">Go to sign in</Link>
        </Button>
      </AuthSplit>
    );
  }

  if (phase === "done") {
    return (
      <AuthSplit>
        <Heading>YOU&apos;RE IN</Heading>
        <div className="mt-6 grid size-14 place-items-center rounded-2xl bg-brand-green/12 text-brand-green">
          <ShieldCheck className="size-7" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Your account is active and your seat is claimed. Taking you to your
          dashboard…
        </p>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit>
      <Heading sub="Confirm your identity, then set a password you'll use to sign in.">
        ACTIVATE YOUR SEAT
      </Heading>
      <div className="mb-4 mt-6 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm">
        <span className="text-muted-foreground">Invitation for </span>
        <span className="font-semibold">{invitedEmail}</span>
      </div>

      <form className="space-y-3" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <Label htmlFor="sn" className="text-sm">Surname</Label>
            <Input id="sn" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Dela Cruz" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fn" className="text-sm">First name</Label>
            <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Juan" />
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
          <Label htmlFor="pw" className="text-sm">Password</Label>
          <div className="relative">
            <Input id="pw" type={showPw ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="pr-11" />
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
          <Input id="pw2" type={showPw ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" />
        </div>

        {error && <p className="text-sm font-medium text-brand-red">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Activate account
          <ArrowRight />
        </Button>
      </form>
    </AuthSplit>
  );
}

function Heading({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <>
      <h1 className="font-display text-4xl leading-none tracking-wide sm:text-5xl">
        {children}
      </h1>
      {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
    </>
  );
}
