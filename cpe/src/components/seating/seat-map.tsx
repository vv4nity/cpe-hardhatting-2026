"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import type { BlockSide, SeatStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface SeatVM {
  key: string;
  label: string;
  side: BlockSide;
  colWithinBlock: number;
  colLetter: string;
  rowNum: number;
  status: SeatStatus;
  dim: boolean;
  selected: boolean;
  isYou: boolean;
  matched: boolean;
}

/** Build seat view-models, mirroring the original seat-filtering logic. */
export function useSeatVMs(presScope?: string | null): {
  seats: SeatVM[];
  filtersActive: boolean;
} {
  const data = useApp((s) => s.data);
  const version = useApp((s) => s.dataVersion);
  const user = useApp((s) => s.user);
  const q = useApp((s) => s.seatSearch).trim().toLowerCase();
  const fBlock = useApp((s) => s.fBlock);
  const fStatus = useApp((s) => s.fStatus);
  const selectedSeat = useApp((s) => s.selectedSeat);
  const focusMine = useApp((s) => s.focusMine);

  return useMemo(() => {
    const filtersActive = fBlock !== "all" || fStatus !== "all" || !!q;
    const focusActive = focusMine && !!user?.id;
    const seats: SeatVM[] = data.seats.map((seat) => {
      const att = seat.attendeeId ? data.attMap[seat.attendeeId] : null;
      const status: SeatStatus = att ? att.status : "available";
      const isYou = !!(att && user?.id && att.id === user.id);

      const inScope = presScope ? seat.blockId === presScope : true;
      let match = true;
      if (q) {
        match =
          seat.label.toLowerCase() === q ||
          !!(att &&
            (att.name.toLowerCase().includes(q) ||
              att.email.toLowerCase().includes(q)));
      }
      if (fBlock !== "all" && seat.blockId !== fBlock) match = false;
      if (fStatus !== "all" && status !== fStatus) match = false;

      const dim =
        !inScope || (filtersActive && !match) || (focusActive && !isYou);
      return {
        key: seat.label,
        label: seat.label,
        side: seat.side,
        colWithinBlock: seat.colWithinBlock,
        colLetter: seat.colLetter,
        rowNum: seat.rowNum,
        status,
        dim,
        selected: selectedSeat === seat.label,
        isYou,
        matched: !!q && match && seat.label.toLowerCase() === q,
      };
    });
    return { seats, filtersActive };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, version, user, q, fBlock, fStatus, selectedSeat, focusMine, presScope]);
}

const LEFT_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const RIGHT_LETTERS = ["K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];

export function SeatMap({
  presScope,
  className,
}: {
  presScope?: string | null;
  className?: string;
}) {
  const cellSize = useApp((s) => s.cellSize);
  const selectSeat = useApp((s) => s.selectSeat);
  const { seats } = useSeatVMs(presScope);

  const gap = Math.max(2, Math.round(cellSize * 0.16));
  const left = seats.filter((s) => s.side === "L");
  const right = seats.filter((s) => s.side === "R");

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="mx-auto w-fit">
        {/* stage */}
        <div className="mb-4 rounded-xl bg-brand-amber px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-brand-ink shadow-sm">
          Bulwagang Balagtas · Stage
        </div>

        <div className="flex items-start justify-center" style={{ gap: cellSize }}>
          <Block
            letters={LEFT_LETTERS}
            seats={left}
            rows={20}
            cellSize={cellSize}
            gap={gap}
            numbersSide="left"
            onSelect={selectSeat}
          />
          {/* center aisle */}
          <div
            className="self-stretch border-x border-dashed border-border"
            style={{ width: Math.max(8, Math.round(cellSize * 0.4)) }}
          />
          <Block
            letters={RIGHT_LETTERS}
            seats={right}
            rows={21}
            cellSize={cellSize}
            gap={gap}
            numbersSide="right"
            onSelect={selectSeat}
          />
        </div>
      </div>
    </div>
  );
}

function Block({
  letters,
  seats,
  rows,
  cellSize,
  gap,
  numbersSide,
  onSelect,
}: {
  letters: string[];
  seats: SeatVM[];
  rows: number;
  cellSize: number;
  gap: number;
  numbersSide: "left" | "right";
  onSelect: (label: string) => void;
}) {
  const fontSize = Math.max(7, Math.round(cellSize * 0.34));
  const radius = Math.max(3, Math.round(cellSize * 0.18));
  const showLabel = cellSize >= 18;
  const showHeader = cellSize >= 16;
  const gutterW = Math.max(16, Math.round(cellSize * 0.8));

  const gutter = showHeader ? (
    <div className="grid pt-7" style={{ gridTemplateRows: `repeat(${rows}, ${cellSize}px)`, gap: `${gap}px` }}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="grid place-items-center text-[10px] font-bold text-muted-foreground"
          style={{ width: gutterW, height: cellSize }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div>
      {showHeader && (
        <div className="mb-1.5 flex items-center" style={{ gap }}>
          {numbersSide === "left" && <div style={{ width: gutterW }} />}
          {letters.map((l) => (
            <div
              key={l}
              className="text-center text-[10px] font-bold text-muted-foreground"
              style={{ width: cellSize }}
            >
              {l}
            </div>
          ))}
          {numbersSide === "right" && <div style={{ width: gutterW }} />}
        </div>
      )}
      <div className="flex" style={{ gap }}>
        {numbersSide === "left" && gutter}
        <div
          className="grid pt-7"
          style={{
            gridTemplateColumns: `repeat(${letters.length}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
            gap: `${gap}px`,
          }}
        >
        {seats.map((s) => {
          const cfg = STATUS[s.status];
          const ring = s.isYou
            ? "#FD8602"
            : s.selected || s.matched
              ? "#1a1712"
              : null;
          return (
            <button
              key={s.key}
              type="button"
              data-seat={s.label}
              onClick={() => onSelect(s.label)}
              title={`${s.label} · ${cfg.label}`}
              className="grid place-items-center font-bold transition-opacity"
              style={{
                gridColumnStart: s.colWithinBlock + 1,
                gridRowStart: s.rowNum,
                width: cellSize,
                height: cellSize,
                fontSize,
                borderRadius: radius,
                background: cfg.c,
                color: cfg.fg,
                opacity: s.dim ? 0.16 : 1,
                outline: ring ? `2.5px solid ${ring}` : "none",
                outlineOffset: 1,
                boxShadow: s.isYou ? "0 0 0 4px rgba(253,134,2,0.2)" : "none",
                position: s.isYou ? "relative" : undefined,
                zIndex: s.isYou ? 20 : undefined,
              }}
            >
              {s.isYou && (
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-orange px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-md">
                  You are here
                  <span className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-brand-orange" />
                </span>
              )}
              {showLabel ? String(s.rowNum) : ""}
            </button>
          );
        })}
        </div>
        {numbersSide === "right" && gutter}
      </div>
    </div>
  );
}

export function SeatLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {STATUS_ORDER.map((k) => (
        <span key={k} className="flex items-center gap-1.5 text-xs font-medium">
          <span
            className="size-3 rounded-[4px]"
            style={{ background: STATUS[k].c }}
          />
          {STATUS[k].label}
        </span>
      ))}
    </div>
  );
}
