"use client";

import { Ban, Check, TriangleAlert, User, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { STATUS } from "@/lib/status";
import { minutesToTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ICONS: Record<string, React.ReactNode> = {
  check: <Check className="size-8" strokeWidth={3} />,
  alert: <TriangleAlert className="size-8" />,
  x: <X className="size-8" strokeWidth={3} />,
  ban: <Ban className="size-8" />,
};

export function ScanResultDialog() {
  const result = useApp((s) => s.scanResult);
  const scanNext = useApp((s) => s.scanNext);

  const hasDetails = !!result?.id;
  const statusCfg = result?.status ? STATUS[result.status] : null;

  return (
    <Dialog open={!!result} onOpenChange={(o) => !o && scanNext()}>
      <DialogContent showClose={false} className="overflow-hidden p-0 text-center">
        {result && (
          <>
            <div
              className="flex flex-col items-center gap-2 px-6 pb-8 pt-7 text-white"
              style={{ background: result.tone }}
            >
              <span className="grid size-16 place-items-center rounded-full bg-white/15">
                {ICONS[result.icon]}
              </span>
              <DialogTitle className="font-display text-2xl tracking-wide text-white">
                {result.title}
              </DialogTitle>
            </div>

            <div className="px-6 pb-6">
              {hasDetails && (
                <div className="-mt-9 mb-3 flex justify-center">
                  <span
                    className="grid size-[72px] place-items-center overflow-hidden rounded-full bg-secondary text-xl font-bold text-muted-foreground shadow-md ring-4 ring-card"
                    aria-label="Profile picture placeholder"
                  >
                    {result.initials || <User className="size-8" />}
                  </span>
                </div>
              )}

              <div className={hasDetails ? "" : "mt-5"}>
                <div className="font-display text-2xl tracking-wide">
                  {result.name}
                </div>
                {statusCfg && (
                  <span
                    className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                    style={{ background: statusCfg.c, color: statusCfg.fg }}
                  >
                    {statusCfg.label}
                  </span>
                )}
                {(result.seat !== "—" || result.block !== "—") && (
                  <div className="mt-1.5 text-sm font-medium text-muted-foreground">
                    Seat {result.seat} · {result.block}
                  </div>
                )}
              </div>

              {hasDetails && (
                <dl className="mt-4 grid grid-cols-2 gap-2 text-left">
                  <Detail label="Attendee ID" value={result.id || "—"} />
                  <Detail
                    label="Check-in"
                    value={
                      result.checkIn ? minutesToTime(result.checkIn) : "Just now"
                    }
                  />
                  <div className="col-span-2">
                    <Detail label="Email" value={result.email || "—"} />
                  </div>
                </dl>
              )}

              <DialogDescription className="mt-4 text-sm">
                {result.sub}
              </DialogDescription>

              <Button size="lg" className="mt-5 w-full" onClick={scanNext}>
                Scan next
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
