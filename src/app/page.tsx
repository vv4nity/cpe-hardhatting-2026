"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  HardHat,
  LogIn,
  MapPin,
  Timer,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { homeFor } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/logo";
import { PartnerLogos } from "@/components/brand/partner-logos";
import { BrandLoader } from "@/components/brand/brand-loader";

const FACTS = [
  { icon: CalendarClock, label: "Date", value: "July 1, 2026 · Wednesday" },
  { icon: MapPin, label: "Venue", value: "Bulwagang Balagtas" },
  { icon: Timer, label: "Call time", value: "1:00 PM" },
  { icon: HardHat, label: "Dress code", value: "Smart casual · white polo" },
];

export default function HomePage() {
  const hydrated = useHydrated();
  const user = useApp((s) => s.user);
  const router = useRouter();

  // signed-in (demo) users skip the landing and go straight to the app
  useEffect(() => {
    if (hydrated && user) router.replace(homeFor(user.role));
  }, [hydrated, user, router]);

  if (!hydrated || user) return <BrandLoader />;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background lg:h-auto lg:min-h-dvh lg:overflow-visible">
      <div className="h-1.5 w-full shrink-0 hazard-stripe" />

      {/* top bar */}
      <header className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between px-5 py-3 sm:px-8 sm:py-4">
        <Wordmark />
        <Button asChild variant="ghost" size="sm">
          <Link href="/signin">
            <LogIn className="size-4" />
            Sign in
          </Link>
        </Button>
      </header>

      {/* hero */}
      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-6 px-5 pb-3 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:content-center lg:gap-14 lg:py-10">
        {/* poster */}
        <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
          {/* desktop: portrait */}
          <div className="relative hidden w-full max-w-sm overflow-hidden rounded-3xl shadow-xl ring-1 ring-brand-ink/10 lg:block">
            <Image
              src="/main cover portrait.jpg"
              alt="Hardhatting Ceremony 2026 — Coded for the Future"
              width={1200}
              height={1500}
              priority
              sizes="(max-width: 1024px) 0px, 24rem"
              className="h-auto w-full"
            />
          </div>
          {/* mobile: landscape — fills the content width so it's proportional */}
          <div className="w-full max-w-sm overflow-hidden rounded-3xl shadow-lg ring-1 ring-brand-ink/10 lg:hidden">
            <Image
              src="/main cover landscape.jpg"
              alt="Hardhatting Ceremony 2026 — Coded for the Future"
              width={820}
              height={360}
              priority
              sizes="(max-width: 1024px) 100vw, 0px"
              className="h-auto w-full"
            />
          </div>
        </div>

        {/* copy */}
        <div className="order-2 animate-fade-up text-center lg:order-1 lg:text-left">
          <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-orange lg:justify-start">
            <span className="size-1.5 rounded-full bg-brand-orange" />
            Coded for the Future
          </div>

          <h1 className="mt-2 font-display text-4xl leading-[0.92] tracking-wide sm:text-6xl lg:mt-3 lg:text-7xl">
            CPE HARDHATTING
            <br className="hidden sm:block" />{" "}
            <span className="text-brand-orange">2026</span>
          </h1>

          <p className="mx-auto mt-2.5 max-w-md text-sm text-muted-foreground lg:mx-0 lg:mt-4 lg:text-base">
            Attendance &amp; QR seating for the 2nd-year Hardhatting Ceremony —
            sign in to view your seat and digital pass.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[13px] lg:mt-5 lg:justify-start lg:text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-medium">
              <CalendarClock className="size-4 text-brand-orange" />
              July 1, 2026
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-medium">
              <MapPin className="size-4 text-brand-orange" />
              Bulwagang Balagtas
            </span>
          </div>

          <div className="mt-5 flex gap-2.5 lg:mt-7">
            <Button asChild size="lg" className="flex-1 lg:flex-none lg:px-10">
              <Link href="/signin">
                <LogIn />
                Sign in
                <ArrowRight />
              </Link>
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Attendees: open the activation link in your invitation email to set
            up your account.
          </p>
        </div>
      </main>

      {/* event details — desktop only */}
      <section className="mx-auto hidden w-full max-w-6xl px-5 pb-10 sm:px-8 lg:block">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-ink text-brand-amber">
                <f.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </div>
                <div className="truncate text-sm font-semibold">{f.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* footer */}
      <footer className="shrink-0 border-t border-border/70 px-5 py-4 sm:py-7">
        <PartnerLogos />
        <p className="mt-3 hidden text-center text-[11px] text-muted-foreground sm:mt-4 sm:block">
          CPE Hardhatting 2026 · In partnership with ACCESS · PUP CpE Department ·
          ICPEP SE - PUP
        </p>
      </footer>
    </div>
  );
}
