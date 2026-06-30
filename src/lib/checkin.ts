"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Real attendance check-in with offline support. When online, calls the
 * `check_in` RPC. When offline (or the call fails), the scan is queued in
 * localStorage and flushed automatically once connectivity returns.
 */

const QUEUE_KEY = "hhc2026-checkin-queue";

export interface QueueItem {
  seat: string;
  ts: number;
}

export type CheckInOutcome =
  | "success"
  | "duplicate"
  | "invalid"
  | "forbidden"
  | "queued";

export interface CheckInResult {
  outcome: CheckInOutcome;
  full_name?: string;
  seat?: string;
  block?: string;
}

function readQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: QueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
export function queueCount(): number {
  return readQueue().length;
}
function enqueue(seat: string) {
  const q = readQueue();
  if (!q.some((i) => i.seat === seat)) q.push({ seat, ts: Date.now() });
  writeQueue(q);
}

/** Fire-and-forget: ask the server to email the attendee a check-in receipt.
 * Best-effort — never blocks or breaks the scan flow. */
function notifyCheckin(seat: string) {
  try {
    void fetch("/api/staff/checkin-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seat }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* no-op */
  }
}

/** Pull the seat out of a scanned QR ("HHC2026:<id>:<seat>") or raw input. */
export function seatFromScan(raw: string): string {
  const t = (raw || "").trim();
  if (t.toUpperCase().startsWith("HHC2026:")) {
    return (t.split(":")[2] || "").trim().toUpperCase();
  }
  return t.toUpperCase();
}

/** Record a check-in for a seat; queues it when offline. */
export async function checkInSeat(seat: string): Promise<CheckInResult> {
  const s = seat.trim().toUpperCase();
  if (!s) return { outcome: "invalid" };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueue(s);
    return { outcome: "queued", seat: s };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("check_in", {
      p_seat: s,
      p_gate: null,
    });
    if (error) {
      enqueue(s);
      return { outcome: "queued", seat: s };
    }
    const r = data as {
      status: CheckInOutcome;
      full_name?: string;
      seat?: string;
      block?: string;
    };
    // first-time check-in → email the attendee a confirmation receipt
    if (r.status === "success") notifyCheckin(s);
    return {
      outcome: r.status,
      full_name: r.full_name,
      seat: r.seat,
      block: r.block,
    };
  } catch {
    enqueue(s);
    return { outcome: "queued", seat: s };
  }
}

/** Flush queued check-ins to the server. Returns how many synced. */
export async function flushQueue(): Promise<number> {
  const q = readQueue();
  if (!q.length || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return 0;
  }
  const supabase = createClient();
  const remaining: QueueItem[] = [];
  let synced = 0;
  for (const item of q) {
    try {
      const { data, error } = await supabase.rpc("check_in", {
        p_seat: item.seat,
        p_gate: null,
      });
      if (error) {
        remaining.push(item);
      } else {
        synced++;
        // only the first successful check-in emails a receipt (not duplicates)
        if ((data as { status?: string })?.status === "success") {
          notifyCheckin(item.seat);
        }
      }
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return synced;
}
