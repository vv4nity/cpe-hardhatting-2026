"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { SECTIONS, SECTION_COLORS, type Section } from "@/lib/sections";
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
  block: string;
  dim: boolean;
  selected: boolean;
  isYou: boolean;
  matched: boolean;
}

type ColorMode = "status" | "section";

/** Fill color for a seat given the current color mode. */
function seatFill(s: SeatVM, mode: ColorMode): { c: string; fg: string } {
  if (mode === "section") {
    if (s.block && s.block in SECTION_COLORS) {
      return SECTION_COLORS[s.block as Section];
    }
    return { c: STATUS.available.c, fg: STATUS.available.fg };
  }
  return STATUS[s.status];
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
      // match by seat label — the data uses synthetic attendee ids, not the
      // signed-in user's id, so comparing ids never works for real accounts
      const isYou = !!(
        user?.seat && seat.label.toUpperCase() === user.seat.toUpperCase()
      );

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
        block: seat.blockId,
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
  const storeCell = useApp((s) => s.cellSize);
  const selectSeat = useApp((s) => s.selectSeat);
  const mode = useApp((s) => s.seatColorMode);
  const { seats } = useSeatVMs(presScope);
  const isDesktop = useIsDesktop();

  const left = seats.filter((s) => s.side === "L");
  const right = seats.filter((s) => s.side === "R");
  const gap = Math.max(2, Math.round(storeCell * 0.16));

  const stage = (
    <div className="mx-auto mb-4 max-w-md rounded-xl bg-brand-amber px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-brand-ink shadow-sm">
      Bulwagang Balagtas · Stage
    </div>
  );

  // Mobile: keep the real side-by-side venue layout but fit the whole map to
  // the screen width via fractional columns (no horizontal scroll). Desktop:
  // side-by-side, fixed size + zoom.
  if (!isDesktop) {
    return (
      <div className={cn(className)}>
        {stage}
        <div className="flex items-start gap-1.5">
          <FluidBlock
            letters={LEFT_LETTERS}
            seats={left}
            mode={mode}
            onSelect={selectSeat}
          />
          <div className="w-2 shrink-0 self-stretch border-x border-dashed border-border" />
          <FluidBlock
            letters={RIGHT_LETTERS}
            seats={right}
            mode={mode}
            onSelect={selectSeat}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      {stage}
      <div className="overflow-x-auto">
        <div className="mx-auto flex w-fit items-start" style={{ gap: storeCell }}>
          <Block
            letters={LEFT_LETTERS}
            seats={left}
            rows={20}
            cellSize={storeCell}
            gap={gap}
            numbersSide="left"
            mode={mode}
            onSelect={selectSeat}
          />
          <div
            className="self-stretch border-x border-dashed border-border"
            style={{ width: Math.max(8, Math.round(storeCell * 0.4)) }}
          />
          <Block
            letters={RIGHT_LETTERS}
            seats={right}
            rows={20}
            cellSize={storeCell}
            gap={gap}
            numbersSide="right"
            mode={mode}
            onSelect={selectSeat}
          />
        </div>
      </div>
    </div>
  );
}

/** Mobile seat block: fractional CSS grid that always fits its container. */
function FluidBlock({
  letters,
  seats,
  mode,
  onSelect,
}: {
  letters: string[];
  seats: SeatVM[];
  mode: ColorMode;
  onSelect: (label: string) => void;
}) {
  const colStyle = {
    gridTemplateColumns: `repeat(${letters.length}, minmax(0, 1fr))`,
  };
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-0.5 grid gap-0.5" style={colStyle}>
        {letters.map((l) => (
          <div
            key={l}
            className="text-center text-[7px] font-bold text-muted-foreground"
          >
            {l}
          </div>
        ))}
      </div>
      <div className="grid gap-0.5 pt-5" style={colStyle}>
        {seats.map((s) => {
          const cfg = seatFill(s, mode);
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
              title={`${s.label} · ${STATUS[s.status].label}${s.block ? " · " + s.block : ""}`}
              className="relative grid aspect-square w-full place-items-center text-[7px] font-bold leading-none transition-opacity"
              style={{
                gridColumnStart: s.colWithinBlock + 1,
                gridRowStart: s.rowNum,
                borderRadius: "20%",
                background: cfg.c,
                color: cfg.fg,
                opacity: s.dim ? 0.16 : 1,
                outline: ring ? `1.5px solid ${ring}` : "none",
                outlineOffset: 1,
                boxShadow: s.isYou ? "0 0 0 2.5px rgba(253,134,2,0.3)" : "none",
                zIndex: s.isYou ? 20 : undefined,
              }}
            >
              {s.isYou && (
                <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-orange px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white shadow-md">
                  You
                  <span className="absolute left-1/2 top-full size-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-brand-orange" />
                </span>
              )}
              {String(s.rowNum)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

function Block({
  letters,
  seats,
  rows,
  cellSize,
  gap,
  numbersSide,
  mode,
  onSelect,
}: {
  letters: string[];
  seats: SeatVM[];
  rows: number;
  cellSize: number;
  gap: number;
  numbersSide: "left" | "right";
  mode: ColorMode;
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
          const cfg = seatFill(s, mode);
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
              title={`${s.label} · ${STATUS[s.status].label}${s.block ? " · " + s.block : ""}`}
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
                <span className="pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg ring-2 ring-white">
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
  const mode = useApp((s) => s.seatColorMode);
  const setMode = useApp((s) => s.setSeatColorMode);

  const items =
    mode === "section"
      ? SECTIONS.map((s) => ({
          key: s,
          color: SECTION_COLORS[s].c,
          label: s.replace("BSCPE ", ""),
        }))
      : STATUS_ORDER.map((k) => ({
          key: k,
          color: STATUS[k].c,
          label: STATUS[k].label,
        }));

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2.5", className)}>
      {/* color-by toggle */}
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
        {(["section", "status"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md px-2.5 py-1 capitalize transition-colors",
              mode === m
                ? "bg-brand-ink text-brand-cream"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "section" ? "Sections" : "Status"}
          </button>
        ))}
      </div>

      {items.map((it) => (
        <span key={it.key} className="flex items-center gap-1.5 text-xs font-medium">
          <span className="size-3 rounded-[4px]" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
