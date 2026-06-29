import type { Dataset, SeatStatus } from "@/lib/types";
import { STATUS } from "@/lib/status";
import { SECTIONS } from "@/lib/sections";
import { hourLabel, minutesToTime } from "@/lib/format";

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
  hour: number;
  label: string;
  value: number;
  /** 0..1 of max */
  ratio: number;
}

const EVENT_CALL_HOUR = 12; // 12:00 PM call time
const MIN_SPAN = 6; // keep the chart readable with at least this many hours

export function computeCheckinChart(data: Dataset): {
  points: ChartPoint[];
  max: number;
  areaPath: string;
  linePath: string;
} {
  // build the hour window from the REAL check-in times; before the event
  // (no check-ins yet) fall back to a window around the call time
  const hours = data.attendees
    .filter((a) => a.checkIn != null)
    .map((a) => Math.floor((a.checkIn as number) / 60));
  let start: number;
  let end: number;
  if (hours.length) {
    start = Math.min(...hours);
    end = Math.max(...hours);
  } else {
    start = EVENT_CALL_HOUR - 1; // 11 AM
    end = EVENT_CALL_HOUR; // noon
  }
  if (end - start < MIN_SPAN - 1) end = start + MIN_SPAN - 1;
  start = Math.max(0, start);
  end = Math.min(23, end);
  const CHART_HOURS: number[] = [];
  for (let h = start; h <= end; h++) CHART_HOURS.push(h);

  const buckets: Record<number, number> = {};
  CHART_HOURS.forEach((h) => (buckets[h] = 0));
  data.attendees.forEach((a) => {
    if (a.checkIn != null) {
      const h = Math.floor(a.checkIn / 60);
      if (buckets[h] != null) buckets[h]++;
    }
  });
  const max = Math.max(1, ...Object.values(buckets));
  const points: ChartPoint[] = CHART_HOURS.map((h) => ({
    hour: h,
    label: hourLabel(h),
    value: buckets[h],
    ratio: buckets[h] / max,
  }));

  const pad = 6;
  const n = CHART_HOURS.length;
  const coords = points.map((p, i) => {
    const x = pad + (i / (n - 1)) * (100 - 2 * pad);
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
