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
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* desktop brand cover (portrait poster) */}
      <div className="relative hidden bg-brand-ink lg:block lg:flex-1">
        <Image
          src="/main cover portrait.jpg"
          alt="Hardhatting 2026 — Coded for the Future · July 1, 2026 · Bulwagang Balagtas"
          fill
          priority
          sizes="50vw"
          className="object-contain object-center"
        />
      </div>

      {/* form */}
      <div className="flex flex-1 items-center justify-center bg-background px-5 py-8 sm:px-8 sm:py-10">
        <div className="w-full max-w-sm animate-fade-up">
          {/* mobile: album-cover poster */}
          <div className="mb-7 flex justify-center lg:hidden">
            <div className="relative w-40 overflow-hidden rounded-2xl shadow-xl ring-1 ring-brand-ink/10">
              <Image
                src="/main cover portrait.jpg"
                alt="Hardhatting Ceremony 2026"
                width={1200}
                height={1500}
                priority
                sizes="160px"
                className="h-auto w-full"
              />
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
            </div>
          </div>

          {!sent ? (
            <>
              <h1 className="font-display text-5xl leading-none tracking-wide">
                WELCOME BACK
              </h1>
              <p className="mt-3 text-base text-muted-foreground">
                Sign in with a magic link to access the event control system.
              </p>

              <form
                className="mt-7 space-y-2"
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
                  className="h-12 text-base"
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
                          "flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-center transition-all",
                          role === r.id
                            ? "border-brand-ink bg-brand-ink text-brand-cream shadow-sm"
                            : "border-input bg-card text-foreground hover:border-brand-orange/60",
                        )}
                      >
                        {ROLE_ICON[r.id]}
                        <span className="text-sm font-semibold leading-tight">
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
            <div className="mt-6">
              <div className="grid size-14 place-items-center rounded-2xl bg-brand-green/12 text-brand-green">
                <MailCheck className="size-7" />
              </div>
              <h1 className="mt-5 font-display text-5xl leading-none tracking-wide">
                CHECK YOUR INBOX
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
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

          {/* partner logos */}
          <PartnerLogos className="mt-10 border-t border-border/70 pt-6" />
        </div>
      </div>
    </div>
  );
}
