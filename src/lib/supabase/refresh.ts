"use client";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildDatasetFromRows,
  timestampToMinutes,
  type RawSeatRow,
} from "@/lib/data/source";
import { useApp } from "@/lib/store";

/**
 * Re-fetches the full directory for staff (admin/scanner) and updates the
 * store. Used by the manual refresh, the realtime subscription, and after a
 * scanner check-in so the dashboards reflect the latest attendance.
 */
export async function refreshStaffData() {
  if (!isSupabaseConfigured) return;
  const u = useApp.getState().user;
  if (!u || (u.role !== "admin" && u.role !== "scanner")) return;

  const supabase = createClient();
  const { data } = await supabase
    .from("directory")
    .select("full_name, email, block, seat, status, checked_in_at, gate")
    .not("seat", "is", null);

  const rows: RawSeatRow[] = (data ?? []).map((d) => ({
    seat: d.seat as string,
    block: d.block as string,
    status: d.status as string,
    name: d.full_name as string,
    email: d.email as string,
    checkIn: timestampToMinutes(d.checked_in_at as string),
    gate: d.gate as string,
  }));

  useApp.setState((s) => ({
    data: buildDatasetFromRows(rows),
    dataVersion: s.dataVersion + 1,
  }));
}
