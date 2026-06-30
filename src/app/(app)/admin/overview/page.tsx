"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronRight,
  Download,
  Flag,
  Loader2,
  Map,
  RefreshCw,
  Send,
  Undo2,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { refreshStaffData } from "@/lib/supabase/refresh";
import {
  computeActivity,
  computeBlockTable,
  computeCheckinChart,
  computeMetrics,
} from "@/lib/views";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionDetailDialog } from "@/components/admin/section-detail-dialog";

export default function OverviewPage() {
  const data = useApp((s) => s.data);
  useApp((s) => s.dataVersion);
  const scanStats = useApp((s) => s.scanStats);
  const exportData = useApp((s) => s.exportData);
  const showToast = useApp((s) => s.showToast);

  const [openSection, setOpenSection] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await refreshStaffData();
    setRefreshing(false);
    showToast("Attendance refreshed", "ok");
  }

  async function finalize(action: "finalize" | "undo") {
    const stillAssigned = data.attendees.filter(
      (a) => a.status === "assigned",
    ).length;
    if (action === "finalize") {
      if (
        !window.confirm(
          `End the event and mark all ${stillAssigned} attendees who haven't checked in as NO-SHOW?\n\nLate arrivals can still be scanned in afterward (they'll flip back to Present).`,
        )
      )
        return;
    } else if (!window.confirm("Revert all no-shows back to “not checked in”?")) {
      return;
    }
    setFinalizing(true);
    try {
      const res = await fetch("/api/admin/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("Couldn't update — please try again.", "warn");
        return;
      }
      await refreshStaffData();
      showToast(
        action === "finalize"
          ? `Event finalized · ${b.count} marked no-show`
          : `Reverted ${b.count} back to not-checked-in`,
        "ok",
      );
    } finally {
      setFinalizing(false);
    }
  }

  const m = computeMetrics(data);
  const chart = computeCheckinChart(data);
  const activity = computeActivity(data);
  const blocks = computeBlockTable(data);
  const peak = chart.points.reduce((a, b) => (b.value > a.value ? b : a));
  const stillAssigned = data.attendees.filter(
    (a) => a.status === "assigned",
  ).length;
  // the finalize control unlocks on event day (July 1, 2026) and after
  const isEventDay = new Date() >= new Date(2026, 6, 1);

  const metrics = [
    { label: "Total registered", value: m.total, sub: `of ${data.seats.length} seats`, tone: "plain" },
    { label: "Present", value: m.present, sub: "checked in", tone: "ink" },
    { label: "Attendance", value: `${m.pct}%`, sub: "turnout rate", tone: "amber" },
    { label: "Duplicate scans", value: scanStats.dup, sub: "flagged today", tone: "plain" },
    { label: "No-shows", value: m.noShow, sub: "absent", tone: "plain" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="EVENT OVERVIEW"
        subtitle="Real-time attendance metrics for Hardhatting 2026."
        actions={
          <>
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button variant="outline" onClick={exportData}>
              <Download /> Export
            </Button>
          </>
        }
      />

      {/* metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {metrics.map((mt) => (
          <Card
            key={mt.label}
            className={
              mt.tone === "ink"
                ? "border-transparent bg-brand-ink text-brand-cream"
                : mt.tone === "amber"
                  ? "border-transparent bg-brand-amber text-brand-ink"
                  : ""
            }
          >
            <CardContent className="p-5">
              <div className="text-[11px] font-bold uppercase tracking-wide opacity-70">
                {mt.label}
              </div>
              <div className="mt-1 font-display text-4xl leading-none">
                {mt.value}
              </div>
              <div className="mt-1 text-xs opacity-70">{mt.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* chart */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Check-ins by 30-minute interval
                </h2>
                <p className="mt-1 text-2xl font-display tracking-wide">
                  {m.present}{" "}
                  <span className="text-sm font-sans font-medium text-muted-foreground">
                    total check-ins
                  </span>
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-amber/15 px-3 py-1 text-xs font-bold text-brand-ink">
                <span className="size-1.5 rounded-full bg-brand-orange" />
                {peak.value > 0 ? `Peak ${peak.label} · ${peak.value}` : "No check-ins yet"}
              </span>
            </div>
            <CheckinChart chart={chart} />
          </CardContent>
        </Card>

        {/* live activity */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Live activity
              </h2>
            </div>
            <ul className="max-h-[22rem] divide-y divide-border/60 overflow-y-auto">
              {activity.length === 0 ? (
                <li className="px-6 py-10 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-amber/15 text-brand-orange">
                    <span className="text-lg font-semibold">•</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    No check-ins yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Activity will appear here as attendees begin checking in.
                  </p>
                </li>
              ) : (
                activity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-6 py-3">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background: a.flagged ? "#FFBF00" : "#2E7D52",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {a.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {a.seat} · {a.block} · {a.scanner}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {a.time}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* block table */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4 sm:px-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Attendance by section
            </h2>
            <div className="flex gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/seating">
                  <Map /> Seating map
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/invitations">
                  <Send /> Invitations
                </Link>
              </Button>
            </div>
          </div>
          {/* mobile: section cards */}
          <div className="space-y-2.5 p-4 lg:hidden">
            {blocks.map((b) => (
              <button
                key={b.block}
                onClick={() => setOpenSection(b.block)}
                className="block w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-brand-amber/50 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{b.block}</span>
                  <span className="flex items-center gap-1 text-sm font-bold tabular-nums">
                    {b.pct}%
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-brand-green"
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <Stat label="Total" value={b.total} />
                  <Stat label="Present" value={b.present} tone="text-brand-green" />
                  <Stat label="Absent" value={b.absent} />
                  <Stat label="No-show" value={b.noShow} tone="text-brand-red" />
                </div>
              </button>
            ))}
          </div>

          {/* desktop: table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-2.5">Section</th>
                  <th className="px-6 py-2.5">Total</th>
                  <th className="px-6 py-2.5">Present</th>
                  <th className="px-6 py-2.5">Absent</th>
                  <th className="px-6 py-2.5">No-show</th>
                  <th className="px-6 py-2.5 w-40">Turnout</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => (
                  <tr
                    key={b.block}
                    onClick={() => setOpenSection(b.block)}
                    className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                  >
                    <td className="px-6 py-3 font-semibold">{b.block}</td>
                    <td className="px-6 py-3">{b.total}</td>
                    <td className="px-6 py-3 text-brand-green font-semibold">
                      {b.present}
                    </td>
                    <td className="px-6 py-3">{b.absent}</td>
                    <td className="px-6 py-3 text-brand-red font-semibold">
                      {b.noShow}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-brand-green"
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs font-semibold">
                          {b.pct}%
                        </span>
                      </div>
                    </td>
                    <td className="pr-4 text-muted-foreground">
                      <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* end-of-event control */}
      <Card className="border-brand-orange/30 bg-brand-orange/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-orange">
              <Flag className="size-4" />
              End of event
            </h2>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              When the doors close, mark everyone who never checked in as a
              no-show — this locks in absences for your report.{" "}
              <span className="font-semibold text-foreground">
                {stillAssigned} not checked in
              </span>{" "}
              · {m.noShow} no-show. Late arrivals scanned after this still count
              as present.
            </p>
            {!isEventDay && (
              <p className="mt-1.5 text-xs font-semibold text-brand-orange">
                Available on event day (July 1).
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {m.noShow > 0 && (
              <Button
                variant="outline"
                onClick={() => finalize("undo")}
                disabled={finalizing}
              >
                <Undo2 /> Undo
              </Button>
            )}
            <Button
              onClick={() => finalize("finalize")}
              disabled={finalizing || stillAssigned === 0 || !isEventDay}
            >
              {finalizing ? <Loader2 className="animate-spin" /> : <Flag />}
              Mark {stillAssigned} as no-show
            </Button>
          </div>
        </CardContent>
      </Card>

      <SectionDetailDialog
        section={openSection}
        onClose={() => setOpenSection(null)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg bg-secondary/40 py-1.5">
      <div className={`text-base font-bold leading-none ${tone ?? ""}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function CheckinChart({
  chart,
}: {
  chart: ReturnType<typeof computeCheckinChart>;
}) {
  const grid = [1, 0.75, 0.5, 0.25, 0];
  const max = chart.max;
  const hasData = chart.points.some((p) => p.value > 0);
  const yLabels = max > 0 ? grid.map((g) => Math.round(max * g)) : [0, 0, 0, 0, 0];

  return (
    <div className="mt-6">
      <div className="relative h-52">
        {/* gridlines + y labels */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {yLabels.map((label, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground/60">
                {label}
              </span>
              <span className="h-px flex-1 bg-border/70" />
            </div>
          ))}
        </div>

        {/* bars */}
        <div className="absolute inset-y-0 left-9 right-0 flex items-end gap-2.5">
          {chart.points.map((p) => {
            const isPeak = p.value === max;
            return (
              <div
                key={p.interval}
                className="group flex h-full flex-1 flex-col items-center justify-end"
              >
                <div
                  className="w-full max-w-[44px] rounded-t-lg shadow-sm transition-all duration-300 group-hover:brightness-105"
                  style={{
                    height: `${Math.max(3, p.ratio * 100)}%`,
                    background: isPeak
                      ? "linear-gradient(180deg,#FD8602,#e0760a)"
                      : "linear-gradient(180deg,#FFCB2E,#FFBF00)",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* x labels */}
      <div className="ml-9 mt-2 flex gap-2.5">
        {chart.points.map((p, i) => {
          const shouldShowLabel = chart.points.length <= 8 || i % 2 === 0 || i === chart.points.length - 1;
          return (
            <span
              key={p.interval}
              className={`flex-1 text-center text-xs font-medium ${
                shouldShowLabel ? (p.value > 0 ? "text-foreground" : "text-muted-foreground") : "text-transparent"
              }`}
            >
              {shouldShowLabel ? p.label : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
