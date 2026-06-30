import type { Dataset, SeatStatus } from "@/lib/types";
import { STATUS } from "@/lib/status";
import { SECTIONS } from "@/lib/sections";
import { minutesToTime } from "@/lib/format";

export interface Metrics {
  total: number;
  present: number;
  noShow: number;
  flagged: number;
  pct: number;
}

export function computeMetrics(data: Dataset): Metrics {
  const A = data.attendees;
  const present = A.filter((a) => a.status === "present").length;
  const noShow = A.filter((a) => a.status === "no-show").length;
  const flagged = A.filter((a) => a.status === "flagged").length;
  const total = A.length;
  const pct = total ? Math.round((present / total) * 100) : 0;
  return { total, present, noShow, flagged, pct };
}

export interface ChartPoint {
  interval: number;
  label: string;
  value: number;
  /** 0..1 of max */
  ratio: number;
}

const EVENT_CALL_TIME = 12 * 60; // 12:00 PM call time in minutes
const INTERVAL_MINUTES = 15; // 15-minute monitoring window
const MIN_INTERVALS = 6; // keep the chart readable with at least 6 intervals

function roundDownToInterval(minutes: number) {
  return Math.floor(minutes / INTERVAL_MINUTES) * INTERVAL_MINUTES;
}

function roundUpToInterval(minutes: number) {
  return Math.ceil(minutes / INTERVAL_MINUTES) * INTERVAL_MINUTES;
}

export function computeCheckinChart(data: Dataset): {
  points: ChartPoint[];
  max: number;
  areaPath: string;
  linePath: string;
} {
  // build the 15-minute window from the REAL check-in times; before the event
  // (no check-ins yet) fall back to a window around the call time
  const checkinTimes = data.attendees
    .filter((a) => a.checkIn != null)
    .map((a) => a.checkIn as number);

  let start: number;
  let end: number;
  if (checkinTimes.length) {
    start = roundDownToInterval(Math.min(...checkinTimes));
    end = roundUpToInterval(Math.max(...checkinTimes));
  } else {
    start = EVENT_CALL_TIME - 60; // 11:00 AM
    end = EVENT_CALL_TIME; // noon
  }

  if (end - start < MIN_INTERVALS * INTERVAL_MINUTES) {
    end = start + MIN_INTERVALS * INTERVAL_MINUTES;
  }
  start = Math.max(0, start);
  end = Math.min(24 * 60 - INTERVAL_MINUTES, end);

  const CHART_INTERVALS: number[] = [];
  for (let t = start; t <= end; t += INTERVAL_MINUTES) {
    CHART_INTERVALS.push(t);
  }

  const buckets: Record<number, number> = {};
  CHART_INTERVALS.forEach((t) => (buckets[t] = 0));
  data.attendees.forEach((a) => {
    if (a.checkIn != null) {
      const interval = Math.floor(a.checkIn / INTERVAL_MINUTES) * INTERVAL_MINUTES;
      if (buckets[interval] != null) buckets[interval]++;
    }
  });
  const max = Math.max(1, ...Object.values(buckets));
  const points: ChartPoint[] = CHART_INTERVALS.map((t) => ({
    interval: t,
    label: minutesToTime(t),
    value: buckets[t],
    ratio: buckets[t] / max,
  }));

  const pad = 6;
  const n = points.length;
  const coords = points.map((p, i) => {
    const x = n > 1 ? pad + (i / (n - 1)) * (100 - 2 * pad) : 50;
    const y = 92 - p.ratio * 74;
    return { x, y };
  });
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    `M ${coords[0].x.toFixed(2)} 100 ` +
    coords.map((c) => `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ") +
    ` L ${coords[n - 1].x.toFixed(2)} 100 Z`;

  return { points, max, areaPath, linePath };
}

export interface ActivityRow {
  id: string;
  name: string;
  seat: string;
  block: string;
  scanner: string;
  time: string;
  flagged: boolean;
}

export function computeActivity(data: Dataset, limit = 12): ActivityRow[] {
  return data.attendees
    .filter((a) => a.checkIn != null)
    .sort((a, b) => (b.checkIn ?? 0) - (a.checkIn ?? 0))
    .slice(0, limit)
    .map((a) => ({
      id: a.id,
      name: a.name,
      seat: a.seat,
      block: a.block,
      scanner: (a.scanner || "").split(" · ")[0],
      time: minutesToTime(a.checkIn),
      flagged: a.status === "flagged",
    }));
}

export interface BlockRow {
  block: string;
  total: number;
  present: number;
  absent: number;
  noShow: number;
  pct: number;
}

export function computeBlockTable(data: Dataset): BlockRow[] {
  return SECTIONS.map((id) => {
    const mem = data.attendees.filter((a) => a.block === id);
    const present = mem.filter((a) => a.status === "present").length;
    const absent = mem.filter((a) => a.status === "assigned").length;
    const noShow = mem.filter((a) => a.status === "no-show").length;
    const pct = mem.length ? Math.round((present / mem.length) * 100) : 0;
    return { block: id, total: mem.length, present, absent, noShow, pct };
  });
}

export interface RosterRow {
  id: string;
  name: string;
  email: string;
  seat: string;
  status: SeatStatus;
  statusLabel: string;
}

export function computeRoster(data: Dataset, blockId: string): RosterRow[] {
  return data.attendees
    .filter((a) => a.block === blockId)
    .slice()
    .sort((a, b) => a.seat.localeCompare(b.seat, undefined, { numeric: true }))
    .map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      seat: a.seat,
      status: a.status,
      statusLabel: STATUS[a.status].label,
    }));
}

export function blockSummary(data: Dataset, blockId: string) {
  const mem = data.attendees.filter((a) => a.block === blockId);
  return {
    total: mem.length,
    present: mem.filter((a) => a.status === "present").length,
    assigned: mem.filter((a) => a.status === "assigned").length,
    noShow: mem.filter((a) => a.status === "no-show").length,
  };
}

export const BLOCK_OPTIONS = [
  { value: "all", label: "All sections" },
  ...SECTIONS.map((id) => ({ value: id, label: id })),
];

export const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...(Object.keys(STATUS) as SeatStatus[]).map((k) => ({
    value: k,
    label: STATUS[k].label,
  })),
];
