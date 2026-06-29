"use client";

import { useRouter } from "next/navigation";
import { Map } from "lucide-react";
import { useApp } from "@/lib/store";
import { STATUS } from "@/lib/status";
import { blockSummary, computeRoster } from "@/lib/views";
import { minutesToTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function SectionDetailDialog({
  section,
  onClose,
}: {
  section: string | null;
  onClose: () => void;
}) {
  const data = useApp((s) => s.data);
  useApp((s) => s.dataVersion);
  const setFBlock = useApp((s) => s.setFBlock);
  const router = useRouter();

  const open = !!section;
  const sum = section ? blockSummary(data, section) : null;
  const roster = section ? computeRoster(data, section) : [];
  const pct = sum && sum.total ? Math.round((sum.present / sum.total) * 100) : 0;

  function viewOnMap() {
    if (!section) return;
    setFBlock(section);
    onClose();
    router.push("/admin/seating");
  }

  const stats = sum
    ? [
        { label: "Total", value: sum.total, tone: "" },
        { label: "Present", value: sum.present, tone: "text-brand-green" },
        { label: "Absent", value: sum.assigned, tone: "" },
        { label: "No-show", value: sum.noShow, tone: "text-brand-red" },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <div className="relative overflow-hidden bg-brand-ink p-6 text-brand-cream">
          <div className="absolute inset-x-0 top-0 h-1 hazard-stripe opacity-90" />
          <DialogHeader>
            <DialogTitle className="font-display text-3xl tracking-wide text-brand-cream">
              {section}
            </DialogTitle>
            <DialogDescription className="text-brand-cream/60">
              {sum?.total ?? 0} assigned · {pct}% turnout
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/5 px-2 py-2.5 text-center"
              >
                <div className={`font-display text-2xl leading-none ${s.tone}`}>
                  {s.value}
                </div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-brand-cream/55">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-brand-green transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-border px-6 pb-2.5 pt-4">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Roster · {roster.length}
          </span>
        </div>
        <div className="max-h-[42vh] overflow-y-auto px-6 py-1">
          <ul className="divide-y divide-border/60">
            {roster.map((r) => {
              const cfg = STATUS[r.status];
              const att = data.attMap[r.id];
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid w-12 shrink-0 place-items-center rounded-lg bg-secondary py-1 font-mono text-xs font-bold">
                    {r.seat}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {att?.checkIn
                        ? `Checked in ${minutesToTime(att.checkIn)}`
                        : r.email}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase"
                    style={{ background: cfg.c, color: cfg.fg }}
                  >
                    {r.statusLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-border p-4">
          <Button className="w-full" onClick={viewOnMap}>
            <Map className="size-4" />
            View {section} on seating map
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
