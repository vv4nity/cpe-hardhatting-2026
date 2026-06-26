"use client";

import { Crosshair } from "lucide-react";
import { useApp } from "@/lib/store";
import { STATUS } from "@/lib/status";
import { minutesToTime } from "@/lib/format";
import type { SeatStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Persistent "this is your seat" reference shown alongside the seat map. */
export function MySeatCard() {
  const user = useApp((s) => s.user);
  const selectSeat = useApp((s) => s.selectSeat);
  const selectedSeat = useApp((s) => s.selectedSeat);
  const focusMine = useApp((s) => s.focusMine);
  const setFocusMine = useApp((s) => s.setFocusMine);

  if (!user?.seat) return null;

  const status = (user.status ?? "assigned") as SeatStatus;
  const cfg = STATUS[status];
  const blockId = user.block || user.presidentBlock || "—";
  function locate() {
    const seat = user?.seat;
    if (!seat) return;
    if (selectedSeat !== seat) selectSeat(seat);
    setFocusMine(true);
    // wait for the selection to render, then bring the seat into view
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-seat="${seat}"]`);
      el?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
      el?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.6)" },
          { transform: "scale(1)" },
        ],
        { duration: 700, easing: "ease-out" },
      );
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 w-full hazard-stripe opacity-90" />
      <CardContent className="p-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Your seat
        </span>

        <div className="mt-3 flex items-center gap-3.5">
          <span
            className="grid size-16 shrink-0 place-items-center rounded-2xl font-display text-2xl tracking-wide shadow-sm"
            style={{
              background: cfg.c,
              color: cfg.fg,
              outline: "3px solid var(--brand-orange)",
              outlineOffset: "2px",
            }}
          >
            {user.seat}
          </span>
          <div className="min-w-0">
            <span
              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
              style={{ background: cfg.c, color: cfg.fg }}
            >
              {cfg.label}
            </span>
            <div className="mt-1.5 truncate text-sm font-semibold">
              {user.name}
            </div>
            <div className="text-xs text-muted-foreground">{blockId}</div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
          <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Block
            </dt>
            <dd className="truncate font-semibold">{blockId}</dd>
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Check-in
            </dt>
            <dd className="truncate font-semibold">
              {user.checkIn ? minutesToTime(user.checkIn) : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={locate}
          >
            <Crosshair className="size-4" />
            Locate on map
          </Button>
          {focusMine && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocusMine(false)}
            >
              Show all
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
