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
  const max = Math.max(...Object.values(buckets));
  const hasData = max > 0;
  const points: ChartPoint[] = CHART_INTERVALS.map((t) => ({
    interval: t,
    label: minutesToTime(t),
    value: buckets[t],
    ratio: hasData ? buckets[t] / max : 0,
  }));

  const pad = 6;
  const n = points.length;
  const coords = points.map((p, i) => {
    const x = n > 1 ? pad + (i / (n - 1)) * (100 - 2 * pad) : 50;
    const y = 92 - p.ratio * 74;
    return { x, y };
  });

  function smoothPathFromCoords(coords: { x: number; y: number }[]) {
    if (coords.length < 2) {
      const point = coords[0];
      return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }

    const dx: number[] = [];
    const dy: number[] = [];
    const slopes: number[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      dx[i] = coords[i + 1].x - coords[i].x;
      dy[i] = coords[i + 1].y - coords[i].y;
      slopes[i] = dy[i] / dx[i];
    }

    const tangents: number[] = new Array(coords.length);
    tangents[0] = slopes[0];
    tangents[coords.length - 1] = slopes[slopes.length - 1];
    for (let i = 1; i < coords.length - 1; i++) {
      tangents[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
    }

    let path = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const start = coords[i];
      const end = coords[i + 1];
      const slopeStart = tangents[i];
      const slopeEnd = tangents[i + 1];
      const cp1x = start.x + dx[i] / 3;
      const cp1y = start.y + slopeStart * (dx[i] / 3);
      const cp2x = end.x - dx[i] / 3;
      const cp2y = end.y - slopeEnd * (dx[i] / 3);
      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    }
    return path;
  }

  const linePath = hasData ? smoothPathFromCoords(coords) : "";
  const areaPath = hasData
    ? `${linePath} L ${coords[n - 1].x.toFixed(2)} 100 L ${coords[0].x.toFixed(2)} 100 Z`
    : "";

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
