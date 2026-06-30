"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useApp } from "@/lib/store";
import { refreshSupabaseData } from "@/lib/supabase/refresh";
import { STATUS } from "@/lib/status";
import { PRESIDENT_SECTION } from "@/lib/sections";
import { blockSummary, computeRoster } from "@/lib/views";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function OversightPage() {
  const user = useApp((s) => s.user)!;
  const data = useApp((s) => s.data);
  useApp((s) => s.dataVersion);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await refreshSupabaseData();
    setRefreshing(false);
  }

  // president-only screen
  useEffect(() => {
    if (user.role !== "president") router.replace("/dashboard");
  }, [user.role, router]);
  if (user.role !== "president") return null;

  const blockId = user.presidentBlock || PRESIDENT_SECTION;
  const sum = blockSummary(data, blockId);
  const roster = computeRoster(data, blockId);

  const stats = [
    { value: sum.total, label: "Assigned", bg: "var(--card)", fg: "var(--foreground)", border: true },
    { value: sum.present, label: "Present", bg: STATUS.present.c, fg: "#fff" },
    { value: sum.assigned, label: "Absent", bg: "var(--card)", fg: "var(--foreground)", border: true },
    { value: sum.noShow, label: "No-show", bg: STATUS["no-show"].c, fg: "#fff" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={`BLOCK OVERSIGHT · ${blockId}`}
        subtitle="Live attendance for the block you supervise."
        actions={
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            style={{ background: s.bg, color: s.fg }}
            className={s.border ? "" : "border-transparent"}
          >
            <CardContent className="p-5">
              <div className="font-display text-4xl leading-none">{s.value}</div>
              <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wide opacity-80">
                {s.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Roster · {roster.length} attendees
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5">Seat</th>
                  <th className="px-5 py-2.5">Name</th>
                  <th className="hidden px-5 py-2.5 sm:table-cell">Email</th>
                  <th className="px-5 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => {
                  const cfg = STATUS[r.status];
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/60 last:border-0 hover:bg-secondary/30"
                    >
                      <td className="px-5 py-2.5 font-mono font-semibold">
                        {r.seat}
                      </td>
                      <td className="px-5 py-2.5 font-medium">{r.name}</td>
                      <td className="hidden max-w-[16rem] truncate px-5 py-2.5 text-muted-foreground sm:table-cell">
                        {r.email}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase"
                          style={{ background: cfg.c, color: cfg.fg }}
                        >
                          {r.statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
