"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  MailCheck,
  ScanLine,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { homeFor } from "@/lib/nav";
import { DEMO_ROLES } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PartnerLogos } from "@/components/brand/partner-logos";

const ROLE_ICON: Record<Role, React.ReactNode> = {
  attendee: <User className="size-5" />,
  president: <Star className="size-5" />,
  scanner: <ScanLine className="size-5" />,
  admin: <ShieldCheck className="size-5" />,
};

export default function LoginPage() {
  const hydrated = useHydrated();
  const user = useApp((s) => s.user);
  const login = useApp((s) => s.login);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("attendee");
  const [sent, setSent] = useState(false);

  // already signed in → bounce to home
  useEffect(() => {
    if (hydrated && user) router.replace(homeFor(user.role));
  }, [hydrated, user, router]);

  function sendLink() {
    if (!email.trim()) return;
    setSent(true);
  }

  function enter() {
    const u = login(role, email.trim() || undefined);
    router.replace(homeFor(u.role));
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-brand-ink">
      {/* ambient brand glow */}
      <div className="pointer-events-none absolute -left-40 -top-40 size-[30rem] rounded-full bg-brand-orange/25 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 size-[34rem] rounded-full bg-brand-amber/15 blur-[130px]" />
      {/* construction tape */}
      <div className="absolute inset-x-0 top-0 z-10 h-1.5 hazard-stripe" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:gap-16 lg:px-10">
        {/* featured poster — desktop */}
        <div className="hidden lg:flex lg:items-center lg:justify-center">
          <div className="group relative w-full max-w-sm">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-brand-amber/25 via-brand-orange/10 to-transparent blur-2xl" />
            <div className="relative -rotate-2 overflow-hidden rounded-[1.75rem] shadow-2xl ring-1 ring-white/10 transition-transform duration-500 ease-out group-hover:rotate-0">
              <Image
                src="/main cover portrait.jpg"
                alt="Hardhatting Ceremony 2026 — Coded for the Future"
                width={1200}
                height={1500}
                priority
                sizes="(max-width: 1024px) 0px, 28rem"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>

        {/* form */}
        <div className="flex w-full flex-col items-center">
          {/* mobile album poster */}
          <div className="mb-6 w-36 overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10 lg:hidden">
            <Image
              src="/main cover portrait.jpg"
              alt="Hardhatting Ceremony 2026"
              width={1200}
              height={1500}
              priority
              sizes="144px"
              className="h-auto w-full"
            />
          </div>

          <div className="relative w-full max-w-md animate-fade-up overflow-hidden rounded-3xl border border-white/10 bg-card p-7 shadow-2xl sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 hazard-stripe opacity-90" />

            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-orange">
              <span className="size-1.5 animate-pulse rounded-full bg-brand-orange" />
              Coded for the Future
            </div>

            {!sent ? (
              <>
                <h1 className="mt-2 font-display text-5xl leading-none tracking-wide">
                  WELCOME BACK
                </h1>
                <p className="mt-2.5 text-[15px] text-muted-foreground">
                  Sign in with a magic link to access the event control system.
                </p>

                <form
                  className="mt-6 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendLink();
                  }}
                >
                  <Label htmlFor="email" className="text-sm">
                    School email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@iskolarngbayan.pup.edu.ph"
                    autoComplete="email"
                    className="h-12 bg-background text-base"
                  />

                  <div className="pt-4">
                    <Label className="mb-2 block text-sm">
                      Sign in as{" "}
                      <span className="text-brand-orange">(demo role)</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {DEMO_ROLES.map((r) => (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => setRole(r.id)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
                            role === r.id
                              ? "border-brand-ink bg-brand-ink text-brand-cream shadow-sm"
                              : "border-input bg-background text-foreground hover:border-brand-orange/60 hover:bg-secondary/40",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-lg",
                              role === r.id
                                ? "bg-brand-amber text-brand-ink"
                                : "bg-secondary text-muted-foreground",
                            )}
                          >
                            {ROLE_ICON[r.id]}
                          </span>
                          <span className="text-[13px] font-semibold leading-tight">
                            {r.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="mt-5 w-full">
                    Send magic link
                    <ArrowRight />
                  </Button>
                </form>

                <p className="mt-5 text-center text-sm text-muted-foreground">
                  Front-only demonstration · no password required
                </p>
              </>
            ) : (
              <div className="mt-2">
                <div className="grid size-14 place-items-center rounded-2xl bg-brand-green/12 text-brand-green">
                  <MailCheck className="size-7" />
                </div>
                <h1 className="mt-5 font-display text-5xl leading-none tracking-wide">
                  CHECK YOUR INBOX
                </h1>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  We sent a sign-in link to{" "}
                  <span className="font-semibold text-foreground">
                    {email || "your email"}
                  </span>
                  . Open it to continue as{" "}
                  <span className="font-semibold text-foreground">
                    {DEMO_ROLES.find((r) => r.id === role)?.label}
                  </span>
                  .
                </p>

                <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
                  This is a front-only demo — there is no real inbox. Use the
                  button below to simulate opening the magic link.
                </div>

                <Button size="lg" className="mt-5 w-full" onClick={enter}>
                  Open magic link
                  <ArrowRight />
                </Button>
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() => setSent(false)}
                >
                  <ArrowLeft />
                  Use a different email or role
                </Button>
              </div>
            )}

            <PartnerLogos className="mt-8 border-t border-border/70 pt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
