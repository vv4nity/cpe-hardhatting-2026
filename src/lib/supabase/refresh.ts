"use client";

import type { Session } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildDatasetFromRows,
  type RawSeatRow,
  timestampToMinutes,
} from "@/lib/data/source";
import { useApp } from "@/lib/store";
import { initialsOf } from "@/lib/format";
import type { Role, SeatStatus, SessionUser } from "@/lib/types";

type MineRow = {
  full_name: string;
  block: string;
  seat: string;
  status: string;
  checked_in_at: string | null;
  gate: string | null;
};

async function syncSession(session: Session | null) {
  if (!session?.user) return;

  const supabase = createClient();
  const uid = session.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .single();
  if (!profile) return;

  const role = profile.role as Role;
  const isStaff = role === "admin" || role === "scanner";
  let rows: RawSeatRow[] = [];
  let myStatus: SeatStatus = (profile.status as SeatStatus) ?? "assigned";
  let mine: MineRow | null = null;

  if (isStaff) {
    const { data } = await supabase
      .from("directory")
      .select("full_name, email, block, seat, status, checked_in_at, gate")
      .not("seat", "is", null);
    rows = (data ?? []).map((d) => ({
      seat: d.seat as string,
      block: d.block as string,
      status: d.status as string,
      name: d.full_name as string,
      email: d.email as string,
      checkIn: timestampToMinutes(d.checked_in_at as string),
      gate: d.gate as string,
    }));
  } else {
    const [{ data: layout }, { data: mineData }] = await Promise.all([
      supabase.from("seat_layout").select("seat, block, status"),
      supabase
        .from("directory")
        .select("full_name, block, seat, status, checked_in_at, gate")
        .eq("claimed_by", uid)
        .maybeSingle(),
    ]);
    mine = (mineData as MineRow | null) ?? null;
    if (mine?.status) myStatus = mine.status as SeatStatus;
    rows = (layout ?? [])
      .filter((s) => s.seat)
      .map((s) => {
        const isMine = !!mine && s.seat === mine.seat;
        return {
          seat: s.seat as string,
          block: s.block as string,
          status: s.status as string,
          name: isMine ? (mine!.full_name as string) : "Attendee",
          email: isMine ? (profile.email as string) : "",
          checkIn: isMine ? timestampToMinutes(mine!.checked_in_at as string) : null,
          gate: isMine ? (mine!.gate as string) : null,
        };
      });
  }

  const name = (mine?.full_name as string) ?? profile.full_name;
  const block = (mine?.block as string) ?? profile.block ?? undefined;
  const user: SessionUser = {
    id: uid,
    role,
    name,
    email: profile.email ?? session.user.email ?? "",
    initials: initialsOf(name),
    block,
    seat: (mine?.seat as string) ?? profile.seat ?? undefined,
    status: myStatus,
    presidentBlock: role === "president" ? block : undefined,
  };

  useApp.setState((s) => ({
    user,
    data: buildDatasetFromRows(rows),
    dataVersion: s.dataVersion + 1,
  }));
}

export async function refreshSupabaseData(session?: Session | null) {
  if (!isSupabaseConfigured) return;
  const supabase = createClient();
  const currentSession =
    session ?? (await supabase.auth.getSession()).data.session ?? null;
  await syncSession(currentSession);
}

/**
 * Re-fetches the full directory for staff (admin/scanner) and updates the
 * store. Used by the manual refresh, the realtime subscription, and after a
 * scanner check-in so the dashboards reflect the latest attendance.
 */
export async function refreshStaffData() {
  if (!isSupabaseConfigured) return;
  const u = useApp.getState().user;
  if (!u || (u.role !== "admin" && u.role !== "scanner")) return;
  await refreshSupabaseData();
}
