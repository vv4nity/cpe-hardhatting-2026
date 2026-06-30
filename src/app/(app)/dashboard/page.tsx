"use client";

import Link from "next/link";
import {
  CalendarClock,
  HardHat,
  MapPin,
  QrCode as QrIcon,
  Timer,
  Users,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { STATUS } from "@/lib/status";
import { firstNameOf, minutesToTime } from "@/lib/format";
import { blockSummary } from "@/lib/views";
import type { SeatStatus } from "@/lib/types";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, passPayload } from "@/components/qr-code";

const HINTS: Record<SeatStatus, string> = {
  present: "You're checked in. Enjoy the ceremony!",
  assigned: "You haven't checked in yet. Head to any gate.",
  flagged: "Your pass was flagged — please see a scanner.",
  "no-show": "Marked as no-show. Contact your block president.",
  available: "No seat assigned yet.",
};

const EVENT_FACTS = [
  { icon: CalendarClock, label: "Date", value: "July 1, 2026 · Wednesday" },
  { icon: MapPin, label: "Venue", value: "Bulwagang Balagtas" },
  { icon: Timer, label: "Call time", value: "12:00 PM" },
  { icon: HardHat, label: "Dress code", value: "Smart casual · white polo" },
];

export default function DashboardPage() {
  const user = useApp((s) => s.user)!;
  const data = useApp((s) => s.data);
  useApp((s) => s.dataVersion); // re-render on live refresh

  const myStatus = (user.status ?? "assigned") as SeatStatus;
  const cfg = STATUS[myStatus];
  const blockId = user.block || user.presidentBlock || "—";
  const summary = blockId !== "—" ? blockSummary(data, blockId) : null;
  const firstName = firstNameOf(user.name) || user.name;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={`HELLO, ${firstName.toUpperCase()}`}
        subtitle="Your attendance pass and event details for Hardhatting 2026."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* status + digital pass + quick actions */}
        <Card className="lg:col-span-2">
          <CardContent className="flex h-full flex-col p-6">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Your status
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold uppercase tracking-wide"
                style={{ background: cfg.c, color: cfg.fg }}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: cfg.fg }}
                />
                {cfg.label}
              </span>
              {myStatus === "present" && user.checkIn != null && (
                <span className="text-sm font-semibold text-brand-green">
                  Checked in at {minutesToTime(user.checkIn)}
                </span>
              )}
              <p className="text-sm text-muted-foreground">{HINTS[myStatus]}</p>
            </div>

            {/* left column (details + quick actions) | digital pass */}
            <div className="mt-6 flex flex-1 flex-col gap-5 sm:flex-row sm:items-stretch">
              <div className="flex flex-1 flex-col gap-5">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Seat" value={user.seat || "—"} />
                  <Field label="Block" value={blockId} />
                  <Field label="Attendee ID" value={user.id || "—"} />
                  <Field
                    label="Block turnout"
                    value={summary ? `${summary.present}/${summary.total}` : "—"}
                  />
                </div>

                <div className="flex flex-1 flex-col">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Quick actions
                  </span>
                  <div className="mt-3 flex flex-1 flex-col gap-2.5">
                    <Button asChild variant="default" className="justify-start">
                      <Link href="/qr">
                        <QrIcon /> Show my QR pass
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                      <Link href="/seating">
                        <MapPin /> Find my seat
                      </Link>
                    </Button>
                    {user.role === "president" && (
                      <Button asChild variant="outline" className="justify-start">
                        <Link href="/oversight">
                          <Users /> Block oversight
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* digital pass ticket */}
              <div className="relative shrink-0 overflow-hidden rounded-2xl bg-brand-ink p-4 text-center text-brand-cream shadow-md sm:w-60">
                <div className="absolute inset-x-0 top-0 h-1 hazard-stripe opacity-90" />
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-cream/70">
                    Digital pass
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-amber">
                    <span className="size-1.5 rounded-full bg-brand-amber" />
                    Live
                  </span>
                </div>
                <div className="mx-auto mt-3 w-full max-w-[200px] rounded-xl bg-white p-3 shadow-inner">
                  <QrCode value={passPayload(user.id, user.seat)} />
                </div>
                <div className="mt-3 font-display text-lg leading-tight tracking-wide">
                  {user.name}
                </div>
                <div className="text-xs text-brand-cream/60">
                  Seat {user.seat || "—"} · {blockId}
                </div>
                <Button
                  asChild
                  variant="accent"
                  size="sm"
                  className="mt-3.5 w-full"
                >
                  <Link href="/qr">
                    <QrIcon className="size-4" />
                    Open full pass
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* event details */}
        <Card>
          <CardContent className="flex h-full flex-col p-6">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Event details
            </span>
            <ul className="mt-4 flex flex-1 flex-col gap-3">
              {EVENT_FACTS.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all hover:border-brand-amber/50 hover:shadow-sm"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-ink text-brand-amber shadow-sm">
                    <f.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {f.label}
                    </div>
                    <div className="truncate text-sm font-semibold">
                      {f.value}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl bg-brand-amber/15 p-3 text-xs text-muted-foreground">
              Have your QR ready at the gate to check in faster.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card px-3.5 py-3 transition-colors hover:border-brand-amber/50">
      <span className="absolute inset-y-0 left-0 w-1 bg-brand-amber/0 transition-colors group-hover:bg-brand-amber" />
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate text-base font-semibold">{value}</div>
    </div>
  );
}
