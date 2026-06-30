"use client";

import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { useApp } from "@/lib/store";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildDatasetFromRows,
  loadDataset,
  timestampToMinutes,
  type RawSeatRow,
} from "@/lib/data/source";
import { initialsOf } from "@/lib/format";
import { refreshStaffData } from "@/lib/supabase/refresh";
import type { Role, SeatStatus, SessionUser } from "@/lib/types";

type MineRow = {
  full_name: string;
  block: string;
  seat: string;
  status: string;
  checked_in_at: string | null;
  gate: string | null;
};

/**
 * Bridges the real Supabase session into the app store. When a user is signed
 * in, it loads their profile + the seat data (role-aware: staff see names,
 * attendees see an anonymized layout) and populates `user` + `data`. Leaves the
 * front-only demo untouched when there's no Supabase session.
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const realRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    let active = true;

    async function sync(session: Session | null) {
      if (!session?.user || !active) return;
      const uid = session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();
      if (!profile || !active) return;

      const role = profile.role as Role;
      const isStaff = role === "admin" || role === "scanner";
      let rows: RawSeatRow[] = [];
      let myStatus: SeatStatus = (profile.status as SeatStatus) ?? "assigned";
      // the attendee's live directory record — the source of truth for their
      // name/seat/block (the `profiles` row is only a snapshot from activation,
      // so reading directory here keeps the account + QR pass current on refresh)
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
              checkIn: isMine
                ? timestampToMinutes(mine!.checked_in_at as string)
                : null,
              gate: isMine ? (mine!.gate as string) : null,
            };
          });
      }

      if (!active) return;
      // prefer the live directory record for attendees; fall back to the profile
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
      realRef.current = true;
      useApp.setState({ user, data: buildDatasetFromRows(rows) });

      // staff dashboards update live as check-ins land
      if (isStaff && !channelRef.current) {
        channelRef.current = supabase
          .channel("directory-attendance")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "directory" },
            () => {
              // debounce so a burst of check-ins triggers one refetch
              if (refreshTimer.current) clearTimeout(refreshTimer.current);
              refreshTimer.current = setTimeout(() => refreshStaffData(), 600);
            },
          )
          .subscribe();

        // safety net: even if the realtime socket silently drops (sleep, flaky
        // venue Wi-Fi, backgrounded tab), re-pull every 30s so event-day
        // dashboards are never more than ~30s stale.
        if (!pollTimer.current) {
          pollTimer.current = setInterval(() => {
            if (document.visibilityState === "visible") refreshStaffData();
          }, 30_000);
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        sync(data.session);
      } else if (useApp.getState().user) {
        // No real session, but a stale (e.g. expired) user is persisted — clear it.
        useApp.setState({ user: null, data: loadDataset() });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        sync(session);
      } else if (event === "SIGNED_OUT" && realRef.current) {
        realRef.current = false;
        useApp.setState({ user: null, data: loadDataset() });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return <>{children}</>;
}
