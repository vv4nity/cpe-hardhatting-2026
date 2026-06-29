import type { Attendee, BlockSide, Dataset, Seat, SeatStatus } from "@/lib/types";

/**
 * Data-source seam. `loadDataset` returns an empty venue (the full seat grid
 * with no attendees) used before a real session syncs; `buildDatasetFromRows`
 * turns real Supabase rows into the same shape once the user is signed in.
 */

let cached: Dataset | null = null;

export function loadDataset(): Dataset {
  if (!cached) cached = buildDatasetFromRows([]);
  return cached;
}

const SCANNERS = ["Gate A · Reyes", "Gate B · Santos", "Lobby · Cruz"];
const ROWS = 20;
const COLS = 20;

export interface RawSeatRow {
  seat: string;
  block: string;
  status: string;
  name?: string | null;
  email?: string | null;
  /** minutes after midnight, or null */
  checkIn?: number | null;
  gate?: string | null;
}

/** Build the app Dataset from real seat rows (with or without names). */
export function buildDatasetFromRows(rows: RawSeatRow[]): Dataset {
  const attendees: Attendee[] = [];
  const attMap: Record<string, Attendee> = {};
  const bySeat: Record<string, { id: string; block: string }> = {};
  let aid = 1;

  for (const r of rows) {
    if (!r.seat) continue;
    const id = "A" + String(aid++).padStart(4, "0");
    const att: Attendee = {
      id,
      name: r.name || "Attendee",
      email: r.email || "",
      block: r.block,
      seat: r.seat,
      status: (r.status as SeatStatus) || "assigned",
      checkIn: r.checkIn ?? null,
      scanner: r.gate ?? null,
    };
    attendees.push(att);
    attMap[id] = att;
    bySeat[r.seat] = { id, block: r.block };
  }

  const seats: Seat[] = [];
  let index = 0;
  for (let row = 1; row <= ROWS; row++) {
    for (let c = 0; c < COLS; c++) {
      const side: BlockSide = c < 10 ? "L" : "R";
      const colLetter = String.fromCharCode(65 + c);
      const label = `${colLetter}${row}`;
      const hit = bySeat[label];
      seats.push({
        index: index++,
        side,
        colIndex: c,
        colLetter,
        colWithinBlock: c < 10 ? c : c - 10,
        rowNum: row,
        label,
        blockId: hit ? hit.block : "",
        attendeeId: hit ? hit.id : null,
      });
    }
  }

  return { seats, attendees, attMap, scanners: SCANNERS };
}

/** "2026-07-01T07:05:00Z" -> minutes after local midnight (for the chart). */
export function timestampToMinutes(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes();
}
