"use client";

import { X } from "lucide-react";
import { useApp } from "@/lib/store";
import { STATUS } from "@/lib/status";
import { minutesToTime } from "@/lib/format";
import type { SeatStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

export function SelectedSeatPanel({ closable = true }: { closable?: boolean }) {
  const selectedSeat = useApp((s) => s.selectedSeat);
  const data = useApp((s) => s.data);
  useApp((s) => s.dataVersion);
  const clear = useApp((s) => s.clearSelectedSeat);

  if (!selectedSeat) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Select a seat on the map to see attendee details.
        </CardContent>
      </Card>
    );
  }

  const seat = data.seats.find((s) => s.label === selectedSeat);
  const att = seat?.attendeeId ? data.attMap[seat.attendeeId] : null;
  const status: SeatStatus = att ? att.status : "available";
  const cfg = STATUS[status];

  const fields = att
    ? [
        { label: "Attendee", value: att.name },
        { label: "Email", value: att.email },
        { label: "Block", value: att.block },
        {
          label: "Check-in",
          value: att.checkIn
            ? `${minutesToTime(att.checkIn)} · ${att.scanner}`
            : "Not yet checked in",
        },
      ]
    : [{ label: "Status", value: "This seat is available / unassigned" }];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl font-display text-xl">
              <span
                className="grid size-12 place-items-center rounded-xl"
                style={{ background: cfg.c, color: cfg.fg }}
              >
                {selectedSeat}
              </span>
            </span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Seat {selectedSeat}
              </div>
              <span
                className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase"
                style={{ background: cfg.c, color: cfg.fg }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
          {closable && (
            <button
              onClick={clear}
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <dl className="mt-4 space-y-3">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {f.label}
              </dt>
              <dd className="truncate text-sm font-semibold">{f.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
